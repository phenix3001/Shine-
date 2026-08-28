alter table public.seller_products
  add column if not exists publication_status text not null default 'draft'
  check (publication_status in ('draft', 'published', 'out_of_stock'));

update public.seller_products set publication_status = 'published' where publication_status = 'draft';

drop policy if exists "read own seller products" on public.seller_products;
create policy "read published or own seller products"
  on public.seller_products for select
  using (publication_status = 'published' or auth.uid() = user_id);

create or replace function public.get_seller_product_brands()
returns table(brand text)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct trim(sp.brand) as brand
  from public.seller_products sp
  where sp.publication_status = 'published' and trim(sp.brand) <> ''
  order by brand;
$$;

grant execute on function public.get_seller_product_brands() to anon, authenticated;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status text not null default 'new' check (status in ('new', 'confirmed', 'cancelled', 'completed')),
  total_amount integer not null default 0 check (total_amount >= 0),
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  phone text not null check (char_length(phone) between 5 and 30),
  delivery_address text not null check (char_length(delivery_address) between 5 and 300),
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;
create policy "read own orders" on public.orders for select using (auth.uid() = user_id);

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid references public.seller_products (id) on delete set null,
  product_name text not null,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 99)
);

alter table public.order_items enable row level security;
create policy "read own order items" on public.order_items for select using (auth.uid() = user_id);

create or replace function public.create_market_order(
  cart_items jsonb,
  customer_name text,
  customer_phone text,
  customer_address text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_order_id uuid;
  item_count integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if char_length(trim(customer_name)) < 2 or char_length(trim(customer_phone)) < 5 or char_length(trim(customer_address)) < 5 then
    raise exception 'Order details are incomplete';
  end if;

  insert into public.orders (user_id, customer_name, phone, delivery_address)
  values (current_user_id, trim(customer_name), trim(customer_phone), trim(customer_address))
  returning id into new_order_id;

  insert into public.order_items (order_id, user_id, product_id, product_name, unit_price, quantity)
  select new_order_id, current_user_id, product.id, product.name, product.price, least(greatest(item.quantity, 1), 99)
  from jsonb_to_recordset(cart_items) as item(product_id uuid, quantity integer)
  join public.seller_products product on product.id = item.product_id
  where product.publication_status = 'published';

  get diagnostics item_count = row_count;
  if item_count = 0 then raise exception 'Cart is empty'; end if;

  update public.orders order_row
  set total_amount = (
    select sum(order_item.unit_price * order_item.quantity)
    from public.order_items order_item where order_item.order_id = new_order_id
  )
  where order_row.id = new_order_id;

  return new_order_id;
end;
$$;

revoke all on function public.create_market_order(jsonb, text, text, text) from public;
grant execute on function public.create_market_order(jsonb, text, text, text) to authenticated;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
