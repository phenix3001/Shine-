-- Rank models before their size variants, then interleave categories.
-- SECURITY INVOKER preserves the existing seller_products RLS rules.
create or replace function public.diverse_catalog(filters jsonb, page_offset integer, page_limit integer)
returns jsonb language sql stable security invoker set search_path = public as $$
  with filtered as (
    select p.*,
      lower(coalesce(nullif(brand, ''), '')) || ':' || coalesce(
        substring(lower(name) from '([[:alnum:]]*[0-9][[:alnum:]]*[-_/][[:alnum:]_/-]+|[0-9]{5,}[[:alnum:]_-]*)'),
        regexp_replace(lower(name), '\s+(размер|длина|вес)\M.*$', '')
      ) as model_key
    from public.seller_products p
    where publication_status = 'published'
      and category in ('Кольца', 'Серьги', 'Браслеты', 'Колье', 'Подвески', 'Броши', 'Другое украшение', 'Украшения')
      and (coalesce(filters->>'search', '') = '' or name ilike '%' || (filters->>'search') || '%')
      and (coalesce(filters->>'category', 'All') = 'All' or category = filters->>'category')
      and (coalesce(filters->>'manufacturer', 'All') = 'All' or brand = filters->>'manufacturer')
      and (filters->>'minPrice' is null or price >= (filters->>'minPrice')::numeric)
      and (filters->>'maxPrice' is null or price <= (filters->>'maxPrice')::numeric)
  ), models as (
    select f.*, row_number() over (partition by model_key order by views_count desc, id) as model_rank
    from filtered f
  ), categories as (
    select m.*, row_number() over (partition by category order by model_rank, views_count desc, md5(id::text), id) as category_rank
    from models m
  ), page as (
    select * from categories
    order by model_rank, category_rank, views_count desc, md5(id::text), id
    offset greatest(0, page_offset) limit least(100, greatest(1, page_limit))
  )
  select jsonb_build_object('total', (select count(*) from filtered), 'products',
    coalesce((select jsonb_agg(to_jsonb(p) - 'model_key' - 'model_rank' - 'category_rank'
      order by model_rank, category_rank, views_count desc, md5(id::text), id) from page p), '[]'::jsonb));
$$;
revoke all on function public.diverse_catalog(jsonb, integer, integer) from public;
grant execute on function public.diverse_catalog(jsonb, integer, integer) to anon, authenticated;
