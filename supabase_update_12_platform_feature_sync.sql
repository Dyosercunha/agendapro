-- AgendaPro SQL 12
-- Sincroniza as melhorias liberadas no Painel Plataforma com os módulos reais
-- da barbearia e impede que o barbeiro libere módulos PRO por conta própria.

create or replace function public.save_platform_feature_flags(
  target_slug text,
  features_input jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  item jsonb;
begin
  if not private.is_platform_admin_email(private.current_auth_email()) then
    raise exception 'Acesso restrito ao administrador da plataforma.';
  end if;

  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  for item in select * from jsonb_array_elements(coalesce(features_input, '[]'::jsonb))
  loop
    insert into public.feature_flags (barbershop_id, feature_key, enabled, released)
    values (
      target_id,
      item->>'feature_key',
      coalesce((item->>'enabled')::boolean, false),
      coalesce((item->>'released')::boolean, false)
    )
    on conflict (barbershop_id, feature_key)
    do update set
      enabled = excluded.enabled,
      released = excluded.released,
      updated_at = now();
  end loop;

  update public.barbershops
  set
    pro_service_delete_enabled = exists (
      select 1 from public.feature_flags
      where barbershop_id = target_id and feature_key = 'service_delete' and enabled and released
    ),
    pro_backplate_enabled = exists (
      select 1 from public.feature_flags
      where barbershop_id = target_id and feature_key = 'backplate' and enabled and released
    ),
    pro_appearance_media_enabled = exists (
      select 1 from public.feature_flags
      where barbershop_id = target_id and feature_key = 'appearance_media' and enabled and released
    ),
    pro_promotions_enabled = exists (
      select 1 from public.feature_flags
      where barbershop_id = target_id and feature_key = 'promotions' and enabled and released
    ),
    pro_waitlist_enabled = exists (
      select 1 from public.feature_flags
      where barbershop_id = target_id and feature_key = 'waitlist' and enabled and released
    ),
    pro_loyalty_enabled = exists (
      select 1 from public.feature_flags
      where barbershop_id = target_id and feature_key = 'loyalty' and enabled and released
    ),
    pro_instagram_enabled = exists (
      select 1 from public.feature_flags
      where barbershop_id = target_id
        and feature_key in ('instagram_booking', 'instagram')
        and enabled
        and released
    ),
    pro_google_client_enabled = exists (
      select 1 from public.feature_flags
      where barbershop_id = target_id
        and feature_key in ('google_login', 'google_client')
        and enabled
        and released
    ),
    updated_at = now()
  where id = target_id;
end;
$$;

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

update public.barbershops shop
set
  pro_service_delete_enabled = exists (
    select 1 from public.feature_flags
    where barbershop_id = shop.id and feature_key = 'service_delete' and enabled and released
  ),
  pro_backplate_enabled = exists (
    select 1 from public.feature_flags
    where barbershop_id = shop.id and feature_key = 'backplate' and enabled and released
  ),
  pro_appearance_media_enabled = exists (
    select 1 from public.feature_flags
    where barbershop_id = shop.id and feature_key = 'appearance_media' and enabled and released
  ),
  pro_promotions_enabled = exists (
    select 1 from public.feature_flags
    where barbershop_id = shop.id and feature_key = 'promotions' and enabled and released
  ),
  pro_waitlist_enabled = exists (
    select 1 from public.feature_flags
    where barbershop_id = shop.id and feature_key = 'waitlist' and enabled and released
  ),
  pro_loyalty_enabled = exists (
    select 1 from public.feature_flags
    where barbershop_id = shop.id and feature_key = 'loyalty' and enabled and released
  ),
  pro_instagram_enabled = exists (
    select 1 from public.feature_flags
    where barbershop_id = shop.id
      and feature_key in ('instagram_booking', 'instagram')
      and enabled
      and released
  ),
  pro_google_client_enabled = exists (
    select 1 from public.feature_flags
    where barbershop_id = shop.id
      and feature_key in ('google_login', 'google_client')
      and enabled
      and released
  ),
  updated_at = now();

revoke update on public.barbershops from anon, authenticated;

grant update (
  name,
  whatsapp,
  address,
  pix_key,
  theme_color,
  logo_url,
  client_background_url,
  admin_background_url,
  client_background_opacity,
  admin_background_opacity,
  before_image_url,
  process_image_url,
  final_image_url,
  before_image_label,
  process_image_label,
  final_image_label,
  promotion_active,
  promotion_title,
  promotion_description,
  promotion_discount,
  promotion_start_date,
  promotion_end_date,
  loyalty_enabled,
  loyalty_reward_description,
  loyalty_visit_goal,
  loyalty_discount,
  instagram_url,
  google_client_login_enabled
) on public.barbershops to authenticated;

grant execute on function public.save_platform_feature_flags(text, jsonb) to authenticated;
