alter table public.seller_products
  drop constraint if exists seller_products_name_check;
alter table public.seller_products
  add constraint seller_products_name_check check (char_length(name) between 2 and 500),
  add column if not exists image_urls jsonb not null default '[]',
  add column if not exists specifications jsonb not null default '[]',
  add column if not exists kaspi_id text,
  add column if not exists import_job_id uuid;

create table public.catalog_import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  status text not null default 'preparing' check (status in ('preparing', 'complete')),
  expected_ids text[] not null,
  old_products jsonb not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.catalog_import_jobs enable row level security;
create policy "read own catalog imports" on public.catalog_import_jobs
  for select to authenticated using (auth.uid() = user_id);
-- Job snapshots and state can only be changed by the controlled functions below.
create unique index one_active_catalog_import on public.catalog_import_jobs(user_id) where status = 'preparing';
create unique index seller_products_import_kaspi_unique on public.seller_products(user_id, import_job_id, kaspi_id)
  where import_job_id is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 15728640, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do nothing;
create policy "read product pictures" on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');
create policy "insert own product pictures" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "update own product pictures" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.begin_kaspi_import(old_ids uuid[], new_ids text[])
returns uuid language plpgsql security definer set search_path = public as $$
declare owner uuid := auth.uid(); job public.catalog_import_jobs; snapshot jsonb; actual_ids uuid[];
begin
  if owner is null then raise exception 'Sign in to import'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner::text, 0));
  if cardinality(new_ids) is null or cardinality(new_ids) < 1 or cardinality(new_ids) > 20000
    or exists(select 1 from unnest(new_ids) n where n is null or n !~ '^[0-9]+$')
    or (select count(distinct n) from unnest(new_ids) n) <> cardinality(new_ids)
    then raise exception 'Invalid source catalog'; end if;
  select * into job from public.catalog_import_jobs where user_id = owner and status = 'preparing';
  if found then
    if not (job.expected_ids @> new_ids and new_ids @> job.expected_ids) then raise exception 'Another catalog import is active'; end if;
    return job.id;
  end if;
  select coalesce(jsonb_agg(to_jsonb(p)), '[]'), coalesce(array_agg(p.id), '{}'::uuid[])
    into snapshot, actual_ids from public.seller_products p where p.user_id = owner;
  if cardinality(old_ids) is null or cardinality(old_ids) <> cardinality(actual_ids)
    or not (old_ids @> actual_ids and actual_ids @> old_ids) then raise exception 'Catalog owner or backup does not match'; end if;
  insert into public.catalog_import_jobs(user_id, expected_ids, old_products)
    values (owner, new_ids, snapshot) returning id into job.id;
  return job.id;
end $$;

create or replace function public.finish_kaspi_import(job_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare owner uuid := auth.uid(); job public.catalog_import_jobs; total integer; removed integer;
begin
  if owner is null then raise exception 'Sign in to import'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner::text, 0));
  select * into job from public.catalog_import_jobs where id = job_id and user_id = owner for update;
  if not found then raise exception 'Import not found'; end if;
  if job.status = 'complete' then return 0; end if;
  select count(*) into total from public.seller_products p where p.user_id = owner and p.import_job_id = job.id
    and p.kaspi_id = any(job.expected_ids) and p.image_url is not null and jsonb_array_length(p.image_urls) > 0;
  if total <> cardinality(job.expected_ids) then raise exception 'New catalog is incomplete'; end if;
  if exists(select 1 from public.seller_products p where p.user_id = owner and p.import_job_id = job.id
    and not (p.kaspi_id = any(job.expected_ids))) then raise exception 'Unexpected imported products'; end if;
  -- If any old row changed since backup, stop rather than deleting newer work.
  if exists(select 1 from jsonb_array_elements(job.old_products) old
    left join public.seller_products p on p.id = (old->>'id')::uuid and p.user_id = owner
    where p.id is null or (to_jsonb(p) - 'views_count') <> (old - 'views_count'))
    then raise exception 'Old catalog changed; replacement stopped'; end if;
  update public.seller_products set publication_status = 'published' where user_id = owner and import_job_id = job.id;
  delete from public.seller_products where user_id = owner
    and id in (select (old->>'id')::uuid from jsonb_array_elements(job.old_products) old);
  get diagnostics removed = row_count;
  update public.catalog_import_jobs set status = 'complete', completed_at = now() where id = job.id;
  return removed;
end $$;
revoke all on function public.begin_kaspi_import(uuid[], text[]) from public, anon;
revoke all on function public.finish_kaspi_import(uuid) from public, anon;
grant execute on function public.begin_kaspi_import(uuid[], text[]) to authenticated;
grant execute on function public.finish_kaspi_import(uuid) to authenticated;
