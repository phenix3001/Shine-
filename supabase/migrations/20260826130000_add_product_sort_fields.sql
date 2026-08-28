alter table public.seller_products
  add column if not exists rating numeric(2, 1) not null default 0 check (rating between 0 and 5),
  add column if not exists discount_percent integer not null default 0 check (discount_percent between 0 and 100);
