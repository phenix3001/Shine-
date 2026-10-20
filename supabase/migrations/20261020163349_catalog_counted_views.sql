-- One view per subject/product/UTC day; no IP address or fingerprint is collected.
create table public.catalog_view_events (
  product_id uuid not null references public.seller_products(id) on delete cascade,
  visitor_id uuid not null,
  user_id uuid references auth.users(id) on delete cascade,
  subject_id uuid not null,
  is_guest boolean generated always as (user_id is null) stored,
  view_day date not null default (now() at time zone 'UTC')::date,
  viewed_at timestamptz not null default now(),
  primary key(is_guest, subject_id, product_id, view_day)
);
alter table public.catalog_view_events enable row level security;
create policy "read own catalog views" on public.catalog_view_events
  for select to authenticated using (auth.uid() = user_id);
revoke all on public.catalog_view_events from public, anon, authenticated;
create index catalog_guest_interests on public.catalog_view_events(visitor_id, viewed_at desc)
  where user_id is null;

create or replace function public.record_catalog_view(product_id uuid, visitor_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare owner uuid := auth.uid(); inserted_count integer;
begin
  if visitor_id is null or visitor_id = '00000000-0000-0000-0000-000000000000'::uuid then return false; end if;
  -- Product eligibility is checked before any write, including authenticated history.
  perform 1 from public.seller_products p where p.id = product_id
    and p.publication_status = 'published' and p.is_silver for key share;
  if not found then return false; end if;
  insert into public.catalog_view_events(product_id, visitor_id, user_id, subject_id)
    values (product_id, visitor_id, owner, coalesce(owner, visitor_id)) on conflict do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count = 1 then
    update public.seller_products p set views_count = least(p.views_count::bigint + 1, 2147483647)::integer where p.id = product_id;
  end if;
  if owner is not null then
    insert into public.product_history(user_id, product_id, viewed_at) values(owner, product_id, now())
      on conflict on constraint product_history_pkey do update set viewed_at = excluded.viewed_at;
  end if;
  return inserted_count = 1;
end $$;
revoke all on function public.record_catalog_view(uuid, uuid) from public;
grant execute on function public.record_catalog_view(uuid, uuid) to anon, authenticated;

-- Existing signed-in clients use the same bounded counter until they upgrade.
create or replace function public.increment_product_view(product_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  if auth.uid() is not null then perform public.record_catalog_view(product_id, auth.uid()); end if;
end $$;
revoke all on function public.increment_product_view(uuid) from public, anon;
grant execute on function public.increment_product_view(uuid) to authenticated;

-- Client inserts/updates may edit product fields, never the derived popularity.
do $$ declare allowed_columns text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into allowed_columns
  from information_schema.columns where table_schema = 'public' and table_name = 'seller_products'
    and column_name not in ('views_count', 'is_silver');
  revoke insert, update on public.seller_products from public, anon, authenticated;
  execute 'grant insert (' || allowed_columns || '), update (' || allowed_columns || ') on public.seller_products to authenticated';
end $$;
