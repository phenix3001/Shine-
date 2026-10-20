-- Counts describe unique visible models, consistently with the catalog's total.
create or replace function public.get_catalog_facets()
returns jsonb language sql stable security invoker set search_path = public as $$
  with products as materialized (
    select p.id, p.category, p.brand, p.specifications, public.catalog_model_key(p.brand, p.name, p.specifications) as model_key
    from public.seller_products p where p.publication_status = 'published' and p.is_silver
      and p.category in ('Кольца', 'Серьги', 'Браслеты', 'Колье', 'Подвески', 'Броши', 'Другое украшение', 'Украшения')
  ), fields(name) as (values ('Вид'), ('Цвет металла'), ('Цвет вставки'), ('Для кого'), ('Материал'),
    ('Проба'), ('Вставка'), ('Застежка'), ('Страна производитель'), ('Особенности')
  ), spec_counts as (
    select f.name, public.catalog_spec_value(v.value) as normalized, min(trim(v.value)) as value, count(distinct p.model_key) as count
    from products p cross join lateral jsonb_array_elements(coalesce(p.specifications, '[]'::jsonb)) s
    join fields f on public.catalog_spec_name(s->>'name') = public.catalog_spec_name(f.name)
    cross join lateral jsonb_array_elements_text(s->'values') v(value)
    where trim(v.value) <> '' group by f.name, public.catalog_spec_value(v.value)
  ), specs as (
    select name, jsonb_agg(jsonb_build_object('value', value, 'count', count) order by count desc, value) as options
    from spec_counts group by name
  ), category_counts as (
    select category as value, count(distinct model_key) as count from products group by category
  ), brand_counts as (
    select brand as value, count(distinct model_key) as count from products where trim(brand) <> '' group by brand
  )
  select jsonb_build_object(
    'categories', coalesce((select jsonb_agg(to_jsonb(c) order by count desc, value) from category_counts c), '[]'::jsonb),
    'manufacturers', coalesce((select jsonb_agg(to_jsonb(b) order by count desc, value) from brand_counts b), '[]'::jsonb),
    'specifications', coalesce((select jsonb_object_agg(name, options) from specs), '{}'::jsonb)
  );
$$;
create or replace function public.get_seller_product_brands()
returns table(brand text) language sql stable security invoker set search_path = public as $$
  select distinct trim(p.brand) from public.seller_products p
    where p.publication_status = 'published' and p.is_silver and trim(p.brand) <> '' order by 1;
$$;
revoke all on function public.get_catalog_facets(), public.get_seller_product_brands() from public;
grant execute on function public.get_catalog_facets(), public.get_seller_product_brands() to anon, authenticated;
