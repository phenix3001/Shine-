update public.seller_products
set brand = case
  when name ilike 'Красносельский ювелирпром %' then 'Красносельский ювелирпром'
  when name ilike 'Красная пресня %' then 'Красная пресня'
  when name ilike 'Вознесенский ЮЗ %' then 'Вознесенский ЮЗ'
  when name ilike 'Sokolov %' then 'Sokolov'
  when name ilike 'TALANT %' then 'TALANT'
  when name ilike 'Altea %' then 'Altea'
  when name ilike 'Алькор %' then 'Алькор'
  when name ilike 'Кубачи %' then 'Кубачи'
  when name ilike 'AQUAMARINE %' then 'AQUAMARINE'
  when name ilike 'Svitozar %' then 'Svitozar'
  when name ilike 'Diamant %' then 'Diamant'
  when name ilike 'Кристалл-L %' then 'Кристалл-L'
  when name ilike 'KRASNOE %' then 'KRASNOE'
  when name ilike 'Вознесенский %' then 'Вознесенский'
  when name ilike 'Prestige %' then 'Prestige'
  when name ilike 'David %' then 'David'
  when name ilike 'POKROVSKY %' then 'POKROVSKY'
  when name ilike 'TEOSA %' then 'TEOSA'
  when name ilike 'Красцветмет %' then 'Красцветмет'
  when name ilike 'Бронницкий %' then 'Бронницкий'
  when name ilike 'EVORA %' then 'EVORA'
  when name ilike 'Viart %' then 'Viart'
  when name ilike 'Efendi-Art %' then 'Efendi-Art'
  when name ilike 'Ювелита %' then 'Ювелита'
  else brand
end
where trim(brand) = '';

create or replace function public.get_seller_product_brands()
returns table(brand text)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct trim(sp.brand) as brand
  from public.seller_products sp
  where sp.user_id = auth.uid() and trim(sp.brand) <> ''
  order by brand;
$$;

grant execute on function public.get_seller_product_brands() to authenticated;
