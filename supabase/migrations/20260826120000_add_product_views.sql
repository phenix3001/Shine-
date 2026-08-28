alter table public.seller_products
  add column if not exists views_count integer not null default 0 check (views_count >= 0);

create or replace function public.increment_product_view(product_id uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.seller_products
  set views_count = views_count + 1
  where id = product_id and user_id = auth.uid();
$$;

grant execute on function public.increment_product_view(uuid) to authenticated;
