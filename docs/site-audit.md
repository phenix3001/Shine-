# Проверка Shine — 19 октября 2026

Изменения подготовлены локально. Проверка не гарантирует отсутствия всех возможных ошибок.

## Что исправлено

- Корзина: повреждённые данные, количества, синхронизация вкладок, недоступное хранилище.
- Заказы: повторная отправка, пробельные поля, подтверждение цены, недоступные позиции, переполнение суммы.
- Аккаунт: сообщения из вопросительных знаков, восстановление сессии, фокус окна входа, единая длина пароля.
- Профиль и каталог: устаревшие запросы, гонки избранного, диапазон цен, сброс поиска, пагинация.
- Товары и продавец: покупка черновиков, ошибочный статус загрузки, Enter в первом шаге формы, некорректные цены и фотографии.
- Импорт: отсутствие цены, наличие, XML с пространствами имён; перенос больше не запускается при открытии страницы.
- Настройки магазина: загрузка другого аккаунта и сброс несохранённой формы при переключении языка.
- Дизайн: Inter, согласованные темы, новые поверхности, мобильное меню, свёрнутые характеристики, контраст и заглушки фото.
- Доступность: клавиатура в фильтрах и вкладках, заголовки, повторные переходы к разделам, подписи элементов.
- Формы аккаунта и корзина переведены на русский, казахский и английский.

Основные файлы: src/pages/{MarketplacePage,ProductPage,CartPage,ProfilePage}, src/components/AccountMenu.tsx,
src/lib/{cartStorage,orderItems,orders,useCatalog,useCatalogFavorites,useSellerCatalog}, src/styles/.
Стили из большого src/index.css разделены на небольшие файлы с сохранением порядка правил.

## Проверки

- npm run build и npm run kaspi:check — успешно.
- npm test — 23 теста успешно.
- SQL-миграция: 9 групп проверок в изолированном PostgreSQL/PGlite — успешно.
- 11 маршрутов × 3 ширины × 2 темы: без ошибок JavaScript и горизонтальной прокрутки.
- Повторные 18 проверок каталога, товара и заполненной корзины: Axe без замечаний.
- Проверены корзина после refresh, галерея, якоря, фокус входа, языки и заблокированный localStorage.
- Карточки в браузере проверены с подставленными данными; записи в облако не выполнялись.

## Подключение восстановлено

После активации проекта Supabase сообщает ACTIVE_HEALTHY. Проверка публичного каталога проходит.
Миграции `20261019163503_validate_market_order.sql` и `20261019174058_catalog_checkbox_filters.sql`
применены после успешного dry-run. Серверная проверка цены и наличия при заказе включена.
Старые вкладки магазина должны обновить страницу: сервер отклоняет заказ без подтверждённой цены.

## SQL новой миграции

Файл: supabase/migrations/20261019163503_validate_market_order.sql

```sql
-- Keep the RPC signature; old clients must refresh and confirm current prices.
create or replace function public.create_market_order(
  cart_items jsonb,
  customer_name text,
  customer_phone text,
  customer_address text
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  new_order_id uuid;
  cart_item jsonb;
  requested_item record;
  product_row public.seller_products%rowtype;
  order_total bigint := 0;
  normalized_name text := regexp_replace(coalesce(customer_name, ''), '^\s+|\s+$', '', 'g');
  normalized_phone text := regexp_replace(coalesce(customer_phone, ''), '^\s+|\s+$', '', 'g');
  normalized_address text := regexp_replace(coalesce(customer_address, ''), '^\s+|\s+$', '', 'g');
begin
  if current_user_id is null then
    raise exception 'ORDER_AUTH_REQUIRED' using errcode = '28000';
  end if;
  if char_length(normalized_name) not between 2 and 100
    or char_length(normalized_phone) not between 5 and 30
    or char_length(normalized_address) not between 5 and 300 then
    raise exception 'ORDER_INVALID_DETAILS';
  end if;
  if jsonb_typeof(cart_items) is distinct from 'array' then
    raise exception 'ORDER_INVALID_CART';
  end if;
  if jsonb_array_length(cart_items) = 0 then
    raise exception 'ORDER_EMPTY_CART';
  end if;

  for cart_item in select value from jsonb_array_elements(cart_items) loop
    if jsonb_typeof(cart_item) is distinct from 'object'
      or jsonb_typeof(cart_item->'product_id') is distinct from 'string'
      or coalesce(cart_item->>'product_id', '') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
      or jsonb_typeof(cart_item->'quantity') is distinct from 'number'
      or coalesce(cart_item->>'quantity', '') !~ '^[1-9][0-9]?$' then
      raise exception 'ORDER_INVALID_CART';
    end if;
    if not (cart_item ? 'expected_price') or cart_item->'expected_price' = 'null'::jsonb then
      raise exception 'ORDER_CONFIRMATION_REQUIRED';
    end if;
    if jsonb_typeof(cart_item->'expected_price') is distinct from 'number'
      or coalesce(cart_item->>'expected_price', '') !~ '^[0-9]{1,10}$' then
      raise exception 'ORDER_INVALID_PRICE';
    end if;
    if (cart_item->>'expected_price')::bigint > 2147483647 then
      raise exception 'ORDER_INVALID_PRICE';
    end if;
  end loop;
  if (select count(distinct (value->>'product_id')::uuid) from jsonb_array_elements(cart_items))
    <> jsonb_array_length(cart_items) then
    raise exception 'ORDER_DUPLICATE_PRODUCT';
  end if;

  insert into public.orders (user_id, customer_name, phone, delivery_address)
  values (current_user_id, normalized_name, normalized_phone, normalized_address)
  returning id into new_order_id;

  -- Shared row locks prevent price/status updates or deletion until commit.
  -- Every checkout acquires them in UUID order to avoid lock-order conflicts.
  for requested_item in
    select * from jsonb_to_recordset(cart_items)
      as item(product_id uuid, quantity integer, expected_price integer)
    order by product_id
  loop
    select * into product_row from public.seller_products
    where id = requested_item.product_id for share;
    if not found or product_row.publication_status <> 'published' then
      raise exception 'ORDER_PRODUCT_UNAVAILABLE';
    end if;
    if product_row.price <> requested_item.expected_price then
      raise exception 'ORDER_PRICE_CHANGED';
    end if;
    order_total := order_total + product_row.price::bigint * requested_item.quantity;
    if order_total > 2147483647 then
      raise exception 'ORDER_TOTAL_TOO_LARGE';
    end if;
    insert into public.order_items (order_id, user_id, product_id, product_name, unit_price, quantity)
    values (new_order_id, current_user_id, product_row.id, product_row.name, product_row.price, requested_item.quantity);
  end loop;

  update public.orders set total_amount = order_total::integer where id = new_order_id;
  return new_order_id;
end;
$$;

revoke all on function public.create_market_order(jsonb, text, text, text) from public;
revoke all on function public.create_market_order(jsonb, text, text, text) from anon;
grant execute on function public.create_market_order(jsonb, text, text, text) to authenticated;
```
