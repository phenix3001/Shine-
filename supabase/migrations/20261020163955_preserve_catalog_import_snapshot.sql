-- Derived fields must not invalidate an import snapshot taken before this migration.
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
    where p.id is null or (to_jsonb(p) - 'views_count' - 'is_silver') <> (old - 'views_count' - 'is_silver'))
    then raise exception 'Old catalog changed; replacement stopped'; end if;
  update public.seller_products set publication_status = 'published' where user_id = owner and import_job_id = job.id;
  delete from public.seller_products where user_id = owner
    and id in (select (old->>'id')::uuid from jsonb_array_elements(job.old_products) old);
  get diagnostics removed = row_count;
  update public.catalog_import_jobs set status = 'complete', completed_at = now() where id = job.id;
  return removed;
end $$;
revoke all on function public.finish_kaspi_import(uuid) from public, anon;
grant execute on function public.finish_kaspi_import(uuid) to authenticated;
