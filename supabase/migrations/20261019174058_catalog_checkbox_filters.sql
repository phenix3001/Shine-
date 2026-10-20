-- Shared normalization keeps checkbox choices and product matching consistent.
create or replace function public.catalog_spec_name(value text)
returns text language sql immutable security invoker set search_path = public as $$
  select case replace(lower(trim(value)), 'ё', 'е')
    when 'вид изделия' then 'вид' when 'тип застежки' then 'застежка'
    when 'страна-производитель' then 'страна производитель'
    else replace(lower(trim(value)), 'ё', 'е') end;
$$;
create or replace function public.catalog_spec_value(value text)
returns text language sql immutable security invoker set search_path = public as $$
  select replace(replace(lower(trim(value)), 'ё', 'е'), ',', '.');
$$;
revoke all on function public.catalog_spec_name(text), public.catalog_spec_value(text) from public;
grant execute on function public.catalog_spec_name(text), public.catalog_spec_value(text) to anon, authenticated;

-- OR within one checkbox group, AND between groups. Legacy text filters still work.
create or replace function public.diverse_catalog(filters jsonb, page_offset integer, page_limit integer)
returns jsonb language sql stable security invoker set search_path = public as $$
  with requested_specs as (
    select s.key, array_agg(distinct public.catalog_spec_value(v.value)) as choices,
      jsonb_typeof(s.value) = 'array' as is_exact
    from jsonb_each(coalesce(nullif(filters->'specifications', 'null'::jsonb), '{}'::jsonb)) s
    cross join lateral jsonb_array_elements_text(case jsonb_typeof(s.value)
      when 'array' then s.value when 'string' then jsonb_build_array(s.value) else '[]'::jsonb end) v(value)
    where trim(v.value) <> '' and s.key in ('Вид', 'Застежка', 'Артикул производителя', 'Цвет металла',
      'Цвет вставки', 'Для кого', 'Проба', 'Материал', 'Вставка', 'Страна производитель', 'Вес изделия', 'Особенности')
    group by s.key, jsonb_typeof(s.value)
  ), filtered as (
    select p.*, lower(coalesce(nullif(brand, ''), '')) || ':' || coalesce(
      substring(lower(name) from '([[:alnum:]]*[0-9][[:alnum:]]*[-_/][[:alnum:]_/-]+|[0-9]{5,}[[:alnum:]_-]*)'),
      regexp_replace(lower(name), '\s+(размер|длина|вес)\M.*$', '')
    ) as model_key
    from public.seller_products p
    where publication_status = 'published'
      and category in ('Кольца', 'Серьги', 'Браслеты', 'Колье', 'Подвески', 'Броши', 'Другое украшение', 'Украшения')
      and (coalesce(trim(filters->>'search'), '') = '' or name ilike '%' || trim(filters->>'search') || '%')
      and (coalesce(filters->>'category', 'All') = 'All' or category = filters->>'category')
      and (coalesce(filters->>'manufacturer', 'All') = 'All' or brand = filters->>'manufacturer')
      and (coalesce(jsonb_array_length(filters->'categories'), 0) = 0 or (filters->'categories') ? category)
      and (coalesce(jsonb_array_length(filters->'manufacturers'), 0) = 0 or (filters->'manufacturers') ? brand)
      and (filters->>'minPrice' is null or price >= (filters->>'minPrice')::numeric)
      and (filters->>'maxPrice' is null or price <= (filters->>'maxPrice')::numeric)
      and not exists (
        select 1 from requested_specs r where not exists (
          select 1 from jsonb_array_elements(coalesce(p.specifications, '[]'::jsonb)) s
          cross join lateral jsonb_array_elements_text(s->'values') v(value)
          where public.catalog_spec_name(s->>'name') = lower(r.key)
            and exists (select 1 from unnest(r.choices) choice where
              case when r.is_exact then public.catalog_spec_value(v.value) = choice
              else strpos(public.catalog_spec_value(v.value), choice) > 0 end)
        )
      )
  ), models as (
    select f.*, row_number() over (partition by model_key order by views_count desc, id) as model_rank from filtered f
  ), categories as (
    select m.*, row_number() over (partition by category order by model_rank, views_count desc, md5(id::text), id) as category_rank from models m
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
    select * from ordered order by result_rank offset greatest(0, page_offset) limit least(100, greatest(1, page_limit))
  )
  select jsonb_build_object('total', (select count(*) from filtered), 'products',
    coalesce((select jsonb_agg(to_jsonb(p) - 'model_key' - 'model_rank' - 'category_rank' - 'result_rank'
      order by result_rank) from page p), '[]'::jsonb));
$$;
revoke all on function public.diverse_catalog(jsonb, integer, integer) from public;
grant execute on function public.diverse_catalog(jsonb, integer, integer) to anon, authenticated;

-- Only published jewelry contributes options; RLS remains enforced by security invoker.
-- SKU and weight stay on product details rather than creating thousands of checkbox rows.
create or replace function public.get_catalog_facets()
returns jsonb language sql stable security invoker set search_path = public as $$
  with products as materialized (
    select id, category, brand, specifications from public.seller_products
    where publication_status = 'published'
      and category in ('Кольца', 'Серьги', 'Браслеты', 'Колье', 'Подвески', 'Броши', 'Другое украшение', 'Украшения')
  ), fields(name) as (values ('Вид'), ('Цвет металла'), ('Цвет вставки'), ('Для кого'), ('Материал'),
    ('Проба'), ('Вставка'), ('Застежка'), ('Страна производитель'), ('Особенности')
  ), spec_counts as (
    select f.name, public.catalog_spec_value(v.value) as normalized, min(trim(v.value)) as value, count(distinct p.id) as count
    from products p cross join lateral jsonb_array_elements(coalesce(p.specifications, '[]'::jsonb)) s
    join fields f on public.catalog_spec_name(s->>'name') = lower(f.name)
    cross join lateral jsonb_array_elements_text(s->'values') v(value)
    where trim(v.value) <> ''
    group by f.name, public.catalog_spec_value(v.value)
  ), specs as (
    select name, jsonb_agg(jsonb_build_object('value', value, 'count', count) order by count desc, value) as options
    from spec_counts group by name
  ), category_counts as (
    select category as value, count(*) as count from products group by category
  ), brand_counts as (
    select brand as value, count(*) as count from products where trim(brand) <> '' group by brand
  )
  select jsonb_build_object(
    'categories', coalesce((select jsonb_agg(to_jsonb(c) order by count desc, value) from category_counts c), '[]'::jsonb),
    'manufacturers', coalesce((select jsonb_agg(to_jsonb(b) order by count desc, value) from brand_counts b), '[]'::jsonb),
    'specifications', coalesce((select jsonb_object_agg(name, options) from specs), '{}'::jsonb)
  );
$$;
revoke all on function public.get_catalog_facets() from public;
grant execute on function public.get_catalog_facets() to anon, authenticated;
