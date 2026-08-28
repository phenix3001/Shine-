create table if not exists public.seller_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  shop_name text not null default 'Shine' check (char_length(shop_name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 500),
  contact_email text not null default '' check (char_length(contact_email) <= 254),
  updated_at timestamptz not null default now()
);

alter table public.seller_settings enable row level security;
create policy "read own seller settings" on public.seller_settings for select using (auth.uid() = user_id);
create policy "insert own seller settings" on public.seller_settings for insert with check (auth.uid() = user_id);
create policy "update own seller settings" on public.seller_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
