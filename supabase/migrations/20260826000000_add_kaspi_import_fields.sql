alter table public.seller_products
  add column if not exists brand text not null default '',
  add column if not exists source_sku text;

create unique index if not exists seller_products_user_source_sku_key
  on public.seller_products (user_id, source_sku);
