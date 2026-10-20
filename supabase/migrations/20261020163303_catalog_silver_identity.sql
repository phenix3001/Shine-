-- Material is authoritative: a 925 assay does not turn gold, leather or alloy into silver.
create or replace function public.catalog_is_silver(
  specifications jsonb, description text default '', product_name text default ''
) returns boolean language plpgsql immutable security invoker set search_path = public as $$
declare materials text[]; assays text[]; value text; content text;
  silver_pattern text := '\m(серебро|серебра|серебром|серебря[[:alpha:]]*|silver|sterling)\M';
  other_pattern text := '\m(золот[[:alpha:]]*|gold|сталь|стали|steel|латун[[:alpha:]]*|brass|медь|меди|copper|бронз[[:alpha:]]*|платин[[:alpha:]]*|титан[[:alpha:]]*|кожа|кожи|леска|текстиль|каучук|керамика|сплав|бижутер[[:alpha:]]*)\M';
  coating_pattern text := '(посеребр|silver.?plat|серебря[[:alpha:]]*\s+покрыт|(серебря[[:alpha:]]*|silver)\s+(цвет|оттенок|colou?r)|(цвет|оттенок|colou?r)\s+(серебря|silver))';
begin
  select array_agg(public.catalog_spec_value(v.value)) filter (where public.catalog_spec_name(s->>'name') in ('материал', 'металл')),
    array_agg(public.catalog_spec_value(v.value)) filter (where public.catalog_spec_name(s->>'name') = 'проба')
    into materials, assays
  from jsonb_array_elements(case when jsonb_typeof(specifications) = 'array' then specifications else '[]'::jsonb end) s
  cross join lateral jsonb_array_elements_text(case when jsonb_typeof(s->'values') = 'array' then s->'values' else '[]'::jsonb end) v(value)
  where trim(v.value) <> '';
  if cardinality(materials) > 0 then
    foreach value in array materials loop
      if value !~ silver_pattern or value ~ other_pattern or value ~ coating_pattern then return false; end if;
    end loop;
    return true;
  end if;
  content := public.catalog_spec_value(coalesce(product_name, '') || ' ' || coalesce(description, ''));
  if content ~ other_pattern or content ~ coating_pattern or content ~ 'не\s+серебр' then return false; end if;
  if cardinality(assays) > 0 then
    return exists (select 1 from unnest(assays) assay where assay ~ '\m(800|830|875|900|925|960)\M')
      and not exists (select 1 from unnest(assays) assay where assay ~ '\m(375|500|583|585|750|916|950|958)\M');
  end if;
  return content ~ silver_pattern;
end $$;

-- Prefer the manufacturer's model; sizes/weights do not create another model.
create or replace function public.catalog_model_key(brand text, product_name text, specifications jsonb)
returns text language sql immutable security invoker set search_path = public as $$
  select regexp_replace(public.catalog_spec_value(coalesce(brand, '')), '[^[:alnum:]]', '', 'g') || ':' ||
    regexp_replace(coalesce(
      (select min(public.catalog_spec_value(v.value)) from jsonb_array_elements(case when jsonb_typeof(specifications) = 'array' then specifications else '[]'::jsonb end) s
        cross join lateral jsonb_array_elements_text(case when jsonb_typeof(s->'values') = 'array' then s->'values' else '[]'::jsonb end) v(value)
        where public.catalog_spec_name(s->>'name') = 'артикул производителя' and trim(v.value) <> ''),
      substring(lower(product_name) from '([[:alnum:]]*[0-9][[:alnum:]]*[-_/][[:alnum:]_/-]+|[0-9]{5,}[[:alnum:]_-]*)'),
      regexp_replace(public.catalog_spec_value(product_name), '\s+(размер|длина|вес)\M.*$', '')
    ), '[^[:alnum:]]', '', 'g');
$$;
revoke all on function public.catalog_is_silver(jsonb, text, text), public.catalog_model_key(text, text, jsonb) from public;
grant execute on function public.catalog_is_silver(jsonb, text, text), public.catalog_model_key(text, text, jsonb) to anon, authenticated;

alter table public.seller_products add column is_silver boolean
  generated always as (public.catalog_is_silver(specifications, description, name)) stored;
create index seller_products_silver_popularity on public.seller_products(views_count desc, id)
  where publication_status = 'published' and is_silver;
