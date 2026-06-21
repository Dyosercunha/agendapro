-- AgendaPro SQL 21
-- Sincroniza o catálogo de melhorias usado pelo Painel Plataforma e pelo Painel da Barbearia.
--
-- Execute depois do SQL 20.

with expected_features(feature_key, enabled, released) as (
  values
    ('pix', true, true),
    ('auto_confirmation', true, true),
    ('service_delete', false, false),
    ('backplate', false, false),
    ('appearance_media', false, false),
    ('promotions', false, false),
    ('waitlist', false, false),
    ('loyalty', false, false),
    ('instagram_booking', false, false),
    ('google_login', false, false),
    ('unique_link', false, false)
)
insert into public.feature_flags (barbershop_id, feature_key, enabled, released)
select shop.id, feature.feature_key, feature.enabled, feature.released
from public.barbershops shop
cross join expected_features feature
on conflict (barbershop_id, feature_key) do nothing;

-- Compatibilidade: se alguma base antiga tiver usado chaves alternativas,
-- mantém as chaves atuais do app refletindo o mesmo estado.
insert into public.feature_flags (barbershop_id, feature_key, enabled, released)
select barbershop_id, 'instagram_booking', enabled, released
from public.feature_flags
where feature_key = 'instagram'
on conflict (barbershop_id, feature_key)
do update set
  enabled = public.feature_flags.enabled or excluded.enabled,
  released = public.feature_flags.released or excluded.released,
  updated_at = now();

insert into public.feature_flags (barbershop_id, feature_key, enabled, released)
select barbershop_id, 'google_login', enabled, released
from public.feature_flags
where feature_key = 'google_client'
on conflict (barbershop_id, feature_key)
do update set
  enabled = public.feature_flags.enabled or excluded.enabled,
  released = public.feature_flags.released or excluded.released,
  updated_at = now();

update public.barbershops shop
set
  pro_service_delete_enabled = exists (
    select 1 from public.feature_flags flag
    where flag.barbershop_id = shop.id
      and flag.feature_key = 'service_delete'
      and flag.enabled
      and flag.released
  ),
  pro_backplate_enabled = exists (
    select 1 from public.feature_flags flag
    where flag.barbershop_id = shop.id
      and flag.feature_key = 'backplate'
      and flag.enabled
      and flag.released
  ),
  pro_appearance_media_enabled = exists (
    select 1 from public.feature_flags flag
    where flag.barbershop_id = shop.id
      and flag.feature_key = 'appearance_media'
      and flag.enabled
      and flag.released
  ),
  pro_promotions_enabled = exists (
    select 1 from public.feature_flags flag
    where flag.barbershop_id = shop.id
      and flag.feature_key = 'promotions'
      and flag.enabled
      and flag.released
  ),
  pro_waitlist_enabled = exists (
    select 1 from public.feature_flags flag
    where flag.barbershop_id = shop.id
      and flag.feature_key = 'waitlist'
      and flag.enabled
      and flag.released
  ),
  pro_loyalty_enabled = exists (
    select 1 from public.feature_flags flag
    where flag.barbershop_id = shop.id
      and flag.feature_key = 'loyalty'
      and flag.enabled
      and flag.released
  ),
  pro_instagram_enabled = exists (
    select 1 from public.feature_flags flag
    where flag.barbershop_id = shop.id
      and flag.feature_key in ('instagram_booking', 'instagram')
      and flag.enabled
      and flag.released
  ),
  pro_google_client_enabled = exists (
    select 1 from public.feature_flags flag
    where flag.barbershop_id = shop.id
      and flag.feature_key in ('google_login', 'google_client')
      and flag.enabled
      and flag.released
  ),
  updated_at = now();

select
  feature_key,
  count(*) as total
from public.feature_flags
where feature_key in (
  'pix',
  'auto_confirmation',
  'service_delete',
  'backplate',
  'appearance_media',
  'promotions',
  'waitlist',
  'loyalty',
  'instagram_booking',
  'google_login',
  'unique_link'
)
group by feature_key
order by feature_key;
