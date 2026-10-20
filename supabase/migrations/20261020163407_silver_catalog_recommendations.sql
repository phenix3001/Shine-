create or replace function public.catalog_recommendations(
  viewed_ids uuid[] default '{}', excluded_ids uuid[] default '{}', seed text default '',
  result_limit integer default 8, visitor_id uuid default null
) returns jsonb language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  with recent_ids as (
    select h.product_id, h.viewed_at from public.product_history h
      where auth.uid() is not null and h.user_id = auth.uid()
    union all
    select e.product_id, max(e.viewed_at) from public.catalog_view_events e
      where auth.uid() is null and $5 is not null and e.visitor_id = $5
        and e.user_id is null group by e.product_id
  ), recent as (
    select product_id from recent_ids order by viewed_at desc, product_id limit 80
  ), interests as (
    select product_id from recent union select unnest((coalesce(viewed_ids, '{}'::uuid[]))[1:80])
  ), interest_products as materialized (
    select p.* from public.seller_products p join interests i on i.product_id = p.id
      where p.publication_status = 'published' and p.is_silver
  ), category_affinity as (
    select category, count(*) as weight from interest_products group by category
  ), brand_affinity as (
    select brand, count(*) as weight from interest_products where trim(brand) <> '' group by brand
  ), blocked_models as (
    select distinct public.catalog_model_key(p.brand, p.name, p.specifications) as model_key
      from public.seller_products p where p.id = any((coalesce(excluded_ids, '{}'::uuid[]))[1:200])
  ), candidates as (
    select p.*, public.catalog_model_key(p.brand, p.name, p.specifications) as model_key,
      coalesce(c.weight, 0) * 4 + coalesce(b.weight, 0) * 2 as interest_score
    from public.seller_products p
    left join category_affinity c on c.category = p.category left join brand_affinity b on b.brand = p.brand
    where p.publication_status = 'published' and p.is_silver
      and p.category in ('Кольца', 'Серьги', 'Браслеты', 'Колье', 'Подвески', 'Броши', 'Другое украшение', 'Украшения')
      and not (p.id = any((coalesce(excluded_ids, '{}'::uuid[]))[1:200]))
      and not exists (select 1 from blocked_models m where m.model_key = public.catalog_model_key(p.brand, p.name, p.specifications))
  ), variants as (
    select c.*, row_number() over (partition by model_key order by interest_score desc, views_count desc,
      md5(coalesce(seed, '') || ':' || id::text), id) as model_rank from candidates c
  ), chosen as (
    select v.*, row_number() over (order by interest_score desc, views_count desc,
      md5(coalesce(seed, '') || ':' || id::text), id) as result_rank
    from variants v where model_rank = 1
    order by result_rank limit least(24, greatest(1, coalesce(result_limit, 8)))
  )
  select coalesce(jsonb_agg(to_jsonb(c) - 'model_key' - 'interest_score' - 'model_rank' - 'result_rank'
    order by result_rank), '[]'::jsonb) from chosen c;
$$;
revoke all on function public.catalog_recommendations(uuid[], uuid[], text, integer, uuid) from public;
grant execute on function public.catalog_recommendations(uuid[], uuid[], text, integer, uuid) to anon, authenticated;
