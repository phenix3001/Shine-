create or replace function public.stage_kaspi_product(job_id uuid, product jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare owner uuid := auth.uid(); job public.catalog_import_jobs; product_id uuid;
begin
  if owner is null then raise exception 'Sign in to import'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner::text, 0));
  select * into job from public.catalog_import_jobs where id = job_id and user_id = owner for update;
  if not found or job.status <> 'preparing' then raise exception 'Import is not active'; end if;
  if product->>'kaspi_id' is null or not ((product->>'kaspi_id') = any(job.expected_ids)) then
    raise exception 'Product is not in source catalog'; end if;
  if jsonb_typeof(product->'image_urls') is distinct from 'array' then raise exception 'Images required'; end if;
  if jsonb_array_length(product->'image_urls') < 1 then raise exception 'Images required'; end if;
  if jsonb_typeof(product->'specifications') is distinct from 'array' then raise exception 'Specifications required'; end if;
  insert into public.seller_products(user_id, name, brand, price, description, category,
    source_sku, kaspi_id, import_job_id, image_url, image_urls, specifications, publication_status)
  values (owner, product->>'name', coalesce(product->>'brand', ''), (product->>'price')::integer,
    coalesce(product->>'description', ''), product->>'category',
    'KASPI:' || job.id::text || ':' || (product->>'kaspi_id'), product->>'kaspi_id', job.id,
    product->'image_urls'->>0, product->'image_urls', product->'specifications', 'draft')
  on conflict (user_id, source_sku) do update set
    name = excluded.name, brand = excluded.brand, price = excluded.price,
    description = excluded.description, category = excluded.category,
    image_url = excluded.image_url, image_urls = excluded.image_urls, specifications = excluded.specifications
  returning id into product_id;
  return product_id;
end $$;
revoke all on function public.stage_kaspi_product(uuid, jsonb) from public, anon;
grant execute on function public.stage_kaspi_product(uuid, jsonb) to authenticated;
