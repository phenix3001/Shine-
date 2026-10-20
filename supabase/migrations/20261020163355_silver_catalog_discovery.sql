-- Filter first, choose one variant per model, then sort and paginate deterministically.
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
    select p.*, public.catalog_model_key(p.brand, p.name, p.specifications) as model_key
    from public.seller_products p where p.publication_status = 'published' and p.is_silver
      and p.category in ('Кольца', 'Серьги', 'Браслеты', 'Колье', 'Подвески', 'Броши', 'Другое украшение', 'Украшения')
      and (coalesce(trim(filters->>'search'), '') = '' or p.name ilike '%' || trim(filters->>'search') || '%')
      and (coalesce(filters->>'category', 'All') = 'All' or p.category = filters->>'category')
      and (coalesce(filters->>'manufacturer', 'All') = 'All' or p.brand = filters->>'manufacturer')
      and (coalesce(jsonb_array_length(filters->'categories'), 0) = 0 or (filters->'categories') ? p.category)
      and (coalesce(jsonb_array_length(filters->'manufacturers'), 0) = 0 or (filters->'manufacturers') ? p.brand)
      and (filters->>'minPrice' is null or p.price >= (filters->>'minPrice')::numeric)
      and (filters->>'maxPrice' is null or p.price <= (filters->>'maxPrice')::numeric)
      and not exists (
        select 1 from requested_specs r where not exists (
          select 1 from jsonb_array_elements(coalesce(p.specifications, '[]'::jsonb)) s
          cross join lateral jsonb_array_elements_text(s->'values') v(value)
          where public.catalog_spec_name(s->>'name') = public.catalog_spec_name(r.key)
            and exists (select 1 from unnest(r.choices) choice where
              case when r.is_exact then public.catalog_spec_value(v.value) = choice
              else strpos(public.catalog_spec_value(v.value), choice) > 0 end)
        )
      )
  ), variants as (
    select f.*, row_number() over (partition by model_key order by
      case when filters->>'sort' = 'price-asc' then price end asc,
      case when filters->>'sort' = 'price-desc' then price end desc,
      views_count desc, md5(coalesce(filters->>'seed', '') || ':' || id::text), id) as model_rank from filtered f
  ), models as (
    select * from variants where model_rank = 1
  ), ordered as (
    select m.*, row_number() over (order by
      case when filters->>'sort' = 'price-asc' then price end asc,
      case when filters->>'sort' = 'price-desc' then price end desc,
      case when filters->>'sort' = 'newest' then created_at end desc,
      case when filters->>'sort' = 'rating' then rating end desc,
      case when filters->>'sort' = 'discount' then discount_percent end desc,
      views_count desc, md5(coalesce(filters->>'seed', '') || ':' || id::text), id
    ) as result_rank from models m
  ), page as (
    select * from ordered order by result_rank offset greatest(0, page_offset) limit least(100, greatest(1, page_limit))
  )
  select jsonb_build_object('total', (select count(*) from models), 'products',
    coalesce((select jsonb_agg(to_jsonb(p) - 'model_key' - 'model_rank' - 'result_rank'
      order by result_rank) from page p), '[]'::jsonb));
$$;
revoke all on function public.diverse_catalog(jsonb, integer, integer) from public;
grant execute on function public.diverse_catalog(jsonb, integer, integer) to anon, authenticated;
