with manufacturers(pattern, normalized_brand) as (
  values
    ('Красносельский ювелирпром', 'Красносельский ювелирпром'),
    ('Красная Пресня', 'Красная Пресня'),
    ('Вознесенский ЮЗ', 'Вознесенский ЮЗ'),
    ('Sokolov', 'Sokolov'),
    ('TALANT', 'TALANT'),
    ('Altea', 'Altea'),
    ('Алькор', 'Алькор'),
    ('Кубачи', 'Кубачи'),
    ('AQUAMARINE', 'AQUAMARINE'),
    ('Svitozar', 'Svitozar'),
    ('Diamant', 'Diamant'),
    ('Кристалл-L', 'Кристалл-L'),
    ('KRASNOE', 'KRASNOE'),
    ('Вознесенский', 'Вознесенский'),
    ('Prestige', 'Prestige'),
    ('David', 'David'),
    ('POKROVSKY', 'POKROVSKY'),
    ('TEOSA', 'TEOSA'),
    ('Красцветмет', 'Красцветмет'),
    ('Бронницкий', 'Бронницкий'),
    ('EVORA', 'EVORA'),
    ('Viart', 'Viart'),
    ('Efendi-Art', 'Efendi-Art'),
    ('Ювелита', 'Ювелита')
), matches as (
  select distinct on (product.id) product.id, manufacturer.normalized_brand
  from public.seller_products product
  join manufacturers manufacturer on product.name ilike '%' || manufacturer.pattern || '%'
  where trim(product.brand) = '' or lower(trim(product.brand)) in ('украшения', 'jewelry', 'әшекейлер')
  order by product.id, char_length(manufacturer.pattern) desc
)
update public.seller_products product
set brand = matches.normalized_brand
from matches
where product.id = matches.id;
