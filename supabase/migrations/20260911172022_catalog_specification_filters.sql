-- Keep filtering and pagination on the server; existing product RLS still applies.
create or replace function public.diverse_catalog(filters jsonb, page_offset integer, page_limit integer)
returns jsonb language sql stable security invoker set search_path = public as $$
  with requested_specs as (
    select key, lower(trim(value)) as value
    from jsonb_each_text(coalesce(nullif(filters->'specifications', 'null'::jsonb), '{}'::jsonb))
    where trim(value) <> '' and key in (
      'Вид', 'Застежка', 'Артикул производителя', 'Цвет металла', 'Цвет вставки',
      'Для кого', 'Проба', 'Материал', 'Вставка', 'Страна производитель', 'Вес изделия', 'Особенности'
    )
  ), filtered as (
    select p.*,
      lower(coalesce(nullif(brand, ''), '')) || ':' || coalesce(
        substring(lower(name) from '([[:alnum:]]*[0-9][[:alnum:]]*[-_/][[:alnum:]_/-]+|[0-9]{5,}[[:alnum:]_-]*)'),
        regexp_replace(lower(name), '\s+(размер|длина|вес)\M.*$', '')
      ) as model_key
    from public.seller_products p
    where publication_status = 'published'
      and category in ('Кольца', 'Серьги', 'Браслеты', 'Колье', 'Подвески', 'Броши', 'Другое украшение', 'Украшения')
      and (coalesce(trim(filters->>'search'), '') = '' or name ilike '%' || trim(filters->>'search') || '%')
      and (coalesce(filters->>'category', 'All') = 'All' or category = filters->>'category')
      and (coalesce(filters->>'manufacturer', 'All') = 'All' or brand = filters->>'manufacturer')
      and (filters->>'minPrice' is null or price >= (filters->>'minPrice')::numeric)
      and (filters->>'maxPrice' is null or price <= (filters->>'maxPrice')::numeric)
      and not exists (
        select 1 from requested_specs r where not exists (
          select 1
          from jsonb_array_elements(coalesce(p.specifications, '[]'::jsonb)) s,
            jsonb_array_elements_text(s->'values') v(value)
          where case replace(lower(trim(s->>'name')), 'ё', 'е')
            when 'вид изделия' then 'вид'
            when 'тип застежки' then 'застежка'
            when 'страна-производитель' then 'страна производитель'
            else replace(lower(trim(s->>'name')), 'ё', 'е')
          end = lower(r.key)
          and strpos(replace(replace(lower(v.value), 'ё', 'е'), ',', '.'),
            replace(replace(r.value, 'ё', 'е'), ',', '.')) > 0
        )
      )
  ), models as (
    select f.*, row_number() over (partition by model_key order by views_count desc, id) as model_rank
    from filtered f
  ), categories as (
    select m.*, row_number() over (partition by category order by model_rank, views_count desc, md5(id::text), id) as category_rank
    from models m
  ), ordered as (
    select c.*, row_number() over (order by
      case when filters->>'sort' = 'price-asc' then price end asc,
      case when filters->>'sort' = 'price-desc' then price end desc,
      case when filters->>'sort' = 'newest' then created_at end desc,
      case when filters->>'sort' = 'rating' then rating end desc,
      case when filters->>'sort' = 'discount' then discount_percent end desc,
      case when coalesce(filters->>'sort', 'popular') = 'popular' then model_rank end,
      case when coalesce(filters->>'sort', 'popular') = 'popular' then category_rank end,
      views_count desc, md5(id::text), id
    ) as result_rank from categories c
  ), page as (
    select * from ordered order by result_rank
    offset greatest(0, page_offset) limit least(100, greatest(1, page_limit))
  )
  select jsonb_build_object('total', (select count(*) from filtered), 'products',
    coalesce((select jsonb_agg(to_jsonb(p) - 'model_key' - 'model_rank' - 'category_rank' - 'result_rank'
      order by result_rank) from page p), '[]'::jsonb));
$$;
revoke all on function public.diverse_catalog(jsonb, integer, integer) from public;
grant execute on function public.diverse_catalog(jsonb, integer, integer) to anon, authenticated;
