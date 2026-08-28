create table if not exists public.product_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.seller_products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.product_favorites enable row level security;
create policy "read own product favorites" on public.product_favorites for select using (auth.uid() = user_id);
create policy "insert own product favorites" on public.product_favorites for insert with check (auth.uid() = user_id);
create policy "delete own product favorites" on public.product_favorites for delete using (auth.uid() = user_id);

create table if not exists public.product_history (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.seller_products (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.product_history enable row level security;
create policy "read own product history" on public.product_history for select using (auth.uid() = user_id);
create policy "insert own product history" on public.product_history for insert with check (auth.uid() = user_id);
create policy "update own product history" on public.product_history for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own product history" on public.product_history for delete using (auth.uid() = user_id);
