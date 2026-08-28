create table if not exists public.seller_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  description text not null default '',
  price integer not null check (price >= 0),
  category text not null,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.seller_products enable row level security;

create policy "read own seller products"
  on public.seller_products for select
  using (auth.uid() = user_id);

create policy "insert own seller products"
  on public.seller_products for insert
  with check (auth.uid() = user_id);

create policy "update own seller products"
  on public.seller_products for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own seller products"
  on public.seller_products for delete
  using (auth.uid() = user_id);
