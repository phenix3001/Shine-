update public.seller_products
set brand = 'Красная Пресня'
where name ilike '%Красная Пресня%'
  and (trim(brand) = '' or brand = 'Украшения');
