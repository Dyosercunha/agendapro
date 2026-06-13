-- AgendaPro SQL 27
-- Saude da plataforma e feature flags por plano.
-- Execute depois do SQL 26.

create table if not exists public.planos (
  id text primary key,
  nome text not null,
  valor_mensal numeric not null default 0,
  feature_multi_barbeiro boolean not null default false,
  feature_lembretes_whatsapp boolean not null default false,
  feature_relatorio_financeiro boolean not null default false,
  feature_historico_clientes boolean not null default false,
  feature_temas_personalizados boolean not null default false,
  feature_limite_agendamentos_mes integer not null default 120,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.planos
  add column if not exists nome text,
  add column if not exists valor_mensal numeric not null default 0,
  add column if not exists feature_multi_barbeiro boolean not null default false,
  add column if not exists feature_lembretes_whatsapp boolean not null default false,
  add column if not exists feature_relatorio_financeiro boolean not null default false,
  add column if not exists feature_historico_clientes boolean not null default false,
  add column if not exists feature_temas_personalizados boolean not null default false,
  add column if not exists feature_limite_agendamentos_mes integer not null default 120,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

insert into public.planos (
  id,
  nome,
  valor_mensal,
  feature_multi_barbeiro,
  feature_lembretes_whatsapp,
  feature_relatorio_financeiro,
  feature_historico_clientes,
  feature_temas_personalizados,
  feature_limite_agendamentos_mes
) values
  ('starter', 'Basico', 49, false, false, false, false, false, 120),
  ('professional', 'Pro', 89, true, false, false, true, true, -1),
  ('premium', 'Premium', 149, true, true, true, true, true, -1)
on conflict (id) do update set
  nome = excluded.nome,
  valor_mensal = excluded.valor_mensal,
  feature_multi_barbeiro = excluded.feature_multi_barbeiro,
  feature_lembretes_whatsapp = excluded.feature_lembretes_whatsapp,
  feature_relatorio_financeiro = excluded.feature_relatorio_financeiro,
  feature_historico_clientes = excluded.feature_historico_clientes,
  feature_temas_personalizados = excluded.feature_temas_personalizados,
  feature_limite_agendamentos_mes = excluded.feature_limite_agendamentos_mes,
  updated_at = now();

alter table public.planos enable row level security;

drop policy if exists planos_read_all on public.planos;
create policy planos_read_all
on public.planos
for select
to anon, authenticated
using (true);

grant select on public.planos to anon, authenticated;

alter table public.barbershop_accounts
  add column if not exists plan_price numeric default 0,
  add column if not exists cancelled_at timestamptz;

alter table public.barbershops
  add column if not exists pro_visual_agenda_enabled boolean default false,
  add column if not exists pro_commissions_enabled boolean default false;

update public.barbershop_accounts
set cancelled_at = coalesce(cancelled_at, updated_at, now())
where monthly_status in ('cancelled', 'archived')
  and cancelled_at is null;

create or replace function private.plan_id_normalized(value text)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(value, '')) in ('starter', 'start', 'basico', 'basic', 'inicial') then 'starter'
    when lower(coalesce(value, '')) in ('professional', 'profissional', 'pro') then 'professional'
    when lower(coalesce(value, '')) in ('premium', 'advanced') then 'premium'
    else 'starter'
  end;
$$;

create or replace function private.plan_rank(value text)
returns integer
language sql
immutable
as $$
  select case private.plan_id_normalized(value)
    when 'premium' then 3
    when 'professional' then 2
    else 1
  end;
$$;

create or replace function private.feature_key_normalized(value text)
returns text
language sql
immutable
as $$
  select case replace(lower(trim(coalesce(value, ''))), '-', '_')
    when 'agenda_visual' then 'visual_agenda'
    when 'visual_schedule' then 'visual_agenda'
    when 'comissao' then 'commissions'
    when 'comissoes' then 'commissions'
    when 'commission' then 'commissions'
    when 'carrossel' then 'appearance_media'
    when 'carousel' then 'appearance_media'
    when 'instagram' then 'instagram_booking'
    when 'google_client' then 'google_login'
    when 'google_client_login' then 'google_login'
    when 'unique_reschedule_link' then 'unique_link'
    when 'reschedule_link' then 'unique_link'
    else replace(lower(trim(coalesce(value, ''))), '-', '_')
  end;
$$;

create or replace function private.plan_allows_feature(
  target_barbershop_id uuid,
  feature text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  clean_feature text;
  plan_id text;
  plan_data public.planos%rowtype;
begin
  clean_feature := private.feature_key_normalized(feature);

  select private.plan_id_normalized(account.plan)
  into plan_id
  from public.barbershop_accounts account
  where account.barbershop_id = target_barbershop_id
  limit 1;

  plan_id := coalesce(plan_id, 'starter');

  select *
  into plan_data
  from public.planos
  where id = plan_id;

  if not found then
    select *
    into plan_data
    from public.planos
    where id = 'starter';
  end if;

  return case
    when clean_feature in ('multi_barbeiro', 'multi_barber', 'multi_professional', 'multi_profissional') then coalesce(plan_data.feature_multi_barbeiro, false)
    when clean_feature in ('lembretes_whatsapp', 'whatsapp_reminders', 'reminders', 'lembretes') then coalesce(plan_data.feature_lembretes_whatsapp, false)
    when clean_feature in ('relatorio_financeiro', 'financial_report', 'financeiro', 'visual_agenda', 'commissions') then coalesce(plan_data.feature_relatorio_financeiro, false)
    when clean_feature in ('historico_clientes', 'customer_history', 'clients', 'clientes', 'waitlist', 'loyalty', 'google_login', 'unique_link') then coalesce(plan_data.feature_historico_clientes, false)
    when clean_feature in ('temas_personalizados', 'custom_themes', 'backplate', 'appearance_media') then coalesce(plan_data.feature_temas_personalizados, false)
    when clean_feature in ('pix', 'auto_confirmation', 'service_delete', 'promotions') then private.plan_rank(plan_id) >= 2
    when clean_feature in ('instagram_booking') then private.plan_rank(plan_id) >= 3
    when clean_feature = 'limite_agendamentos_mes' then coalesce(plan_data.feature_limite_agendamentos_mes, 0) <> 0
    else false
  end;
end;
$$;

create or replace function public.has_feature(
  target_slug text,
  feature text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_id uuid;
  clean_feature text;
  status_value text;
  feature_is_flag boolean;
begin
  clean_feature := private.feature_key_normalized(feature);

  select shop.id, coalesce(account.monthly_status, 'trial')
  into target_id, status_value
  from public.barbershops shop
  left join public.barbershop_accounts account on account.barbershop_id = shop.id
  where shop.slug = target_slug
    and shop.archived_at is null
  limit 1;

  if target_id is null then
    return false;
  end if;

  if status_value in ('blocked', 'cancelled', 'archived') then
    return false;
  end if;

  if not private.plan_allows_feature(target_id, clean_feature) then
    return false;
  end if;

  feature_is_flag := clean_feature in (
    'pix',
    'auto_confirmation',
    'service_delete',
    'backplate',
    'appearance_media',
    'promotions',
    'visual_agenda',
    'commissions',
    'waitlist',
    'loyalty',
    'google_login',
    'instagram_booking',
    'unique_link'
  );

  if not feature_is_flag then
    return true;
  end if;

  return exists (
    select 1
    from public.feature_flags flag
    where flag.barbershop_id = target_id
      and private.feature_key_normalized(flag.feature_key) = clean_feature
      and coalesce(flag.released, false) = true
      and coalesce(flag.enabled, false) = true
  );
end;
$$;

create or replace function public.assert_feature(
  target_slug text,
  feature text
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_feature(target_slug, feature) then
    raise exception 'Recurso indisponivel no plano atual. Faca upgrade para liberar.'
      using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.has_feature(text, text) from public;
revoke execute on function public.assert_feature(text, text) from public;
grant execute on function public.has_feature(text, text) to anon, authenticated;
grant execute on function public.assert_feature(text, text) to authenticated;

with expected_features(feature_key, enabled, released) as (
  values
    ('pix', true, true),
    ('auto_confirmation', true, true),
    ('service_delete', false, false),
    ('backplate', false, false),
    ('appearance_media', false, false),
    ('promotions', false, false),
    ('visual_agenda', false, false),
    ('commissions', false, false),
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
  clean_feature text;
  plan_allowed boolean;
  next_enabled boolean;
  next_released boolean;
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
    clean_feature := private.feature_key_normalized(item->>'feature_key');
    plan_allowed := private.plan_allows_feature(target_id, clean_feature);
    next_released := plan_allowed and coalesce((item->>'released')::boolean, false);
    next_enabled := plan_allowed and next_released and coalesce((item->>'enabled')::boolean, false);

    insert into public.feature_flags (barbershop_id, feature_key, enabled, released)
    values (target_id, clean_feature, next_enabled, next_released)
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
    pro_visual_agenda_enabled = exists (
      select 1 from public.feature_flags
      where barbershop_id = target_id and feature_key = 'visual_agenda' and enabled and released
    ),
    pro_commissions_enabled = exists (
      select 1 from public.feature_flags
      where barbershop_id = target_id and feature_key = 'commissions' and enabled and released
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

create or replace function public.save_feature_flags(
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
  current_role text;
  clean_feature text;
  plan_allowed boolean;
  next_enabled boolean;
  next_released boolean;
begin
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  current_role := private.current_barbershop_role_by_id(target_id);

  if current_role not in ('platform', 'owner') then
    raise exception 'Apenas o desenvolvedor ou o dono podem gerenciar melhorias desta barbearia.';
  end if;

  for item in select * from jsonb_array_elements(coalesce(features_input, '[]'::jsonb))
  loop
    clean_feature := private.feature_key_normalized(item->>'feature_key');
    plan_allowed := private.plan_allows_feature(target_id, clean_feature);

    if current_role = 'platform' then
      next_released := plan_allowed and coalesce((item->>'released')::boolean, false);
      next_enabled := plan_allowed and next_released and coalesce((item->>'enabled')::boolean, false);

      insert into public.feature_flags (barbershop_id, feature_key, enabled, released)
      values (target_id, clean_feature, next_enabled, next_released)
      on conflict (barbershop_id, feature_key)
      do update set
        enabled = excluded.enabled,
        released = excluded.released,
        updated_at = now();
    else
      if not plan_allowed then
        update public.feature_flags
        set enabled = false, released = false, updated_at = now()
        where barbershop_id = target_id
          and private.feature_key_normalized(feature_key) = clean_feature;
      else
        update public.feature_flags
        set
          enabled = coalesce((item->>'enabled')::boolean, false),
          updated_at = now()
        where barbershop_id = target_id
          and private.feature_key_normalized(feature_key) = clean_feature
          and released = true;
      end if;
    end if;
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
    pro_visual_agenda_enabled = exists (
      select 1 from public.feature_flags
      where barbershop_id = target_id and feature_key = 'visual_agenda' and enabled and released
    ),
    pro_commissions_enabled = exists (
      select 1 from public.feature_flags
      where barbershop_id = target_id and feature_key = 'commissions' and enabled and released
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

create or replace function public.save_background_settings(
  target_slug text,
  client_background_url_input text,
  admin_background_url_input text,
  client_background_opacity_input numeric,
  admin_background_opacity_input numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  if not private.can_manage_barbershop_as(target_id, array['owner']) then
    raise exception 'Apenas o dono pode alterar a aparencia desta barbearia.';
  end if;

  perform public.assert_feature(target_slug, 'backplate');

  update public.barbershops
  set
    client_background_url = nullif(client_background_url_input, ''),
    admin_background_url = nullif(admin_background_url_input, ''),
    client_background_opacity = least(greatest(coalesce(client_background_opacity_input, 0.18), 0), 0.7),
    admin_background_opacity = least(greatest(coalesce(admin_background_opacity_input, 0.12), 0), 0.7),
    updated_at = now()
  where id = target_id;
end;
$$;

create or replace function public.save_appearance_media(
  target_slug text,
  before_image_url_input text,
  process_image_url_input text,
  final_image_url_input text,
  before_image_label_input text,
  process_image_label_input text,
  final_image_label_input text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  if not private.can_manage_barbershop_as(target_id, array['owner']) then
    raise exception 'Apenas o dono pode alterar a aparencia desta barbearia.';
  end if;

  perform public.assert_feature(target_slug, 'appearance_media');

  update public.barbershops
  set
    before_image_url = nullif(before_image_url_input, ''),
    process_image_url = nullif(process_image_url_input, ''),
    final_image_url = nullif(final_image_url_input, ''),
    before_image_label = coalesce(nullif(before_image_label_input, ''), 'Antes'),
    process_image_label = coalesce(nullif(process_image_label_input, ''), 'Processo'),
    final_image_label = coalesce(nullif(final_image_label_input, ''), 'Finalizado'),
    updated_at = now()
  where id = target_id;
end;
$$;

create or replace function public.save_appearance_center(
  target_slug text,
  theme_mode_input text,
  welcome_message_input text,
  rating_value_input numeric,
  rating_text_input text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  if not private.can_manage_barbershop_as(target_id, array['owner']) then
    raise exception 'Apenas o dono pode alterar a aparencia desta barbearia.';
  end if;

  perform public.assert_feature(target_slug, 'temas_personalizados');

  update public.barbershops
  set
    theme_mode = case when theme_mode_input = 'light' then 'light' else 'dark' end,
    welcome_message = nullif(trim(coalesce(welcome_message_input, '')), ''),
    rating_value = least(greatest(coalesce(rating_value_input, 5.0), 0), 5),
    rating_text = nullif(trim(coalesce(rating_text_input, '')), ''),
    updated_at = now()
  where id = target_id;
end;
$$;

create or replace function public.save_premium_appearance(
  target_slug text,
  logo_url_input text,
  theme_color_input text,
  client_background_url_input text,
  admin_background_url_input text,
  client_background_opacity_input numeric,
  admin_background_opacity_input numeric,
  before_image_url_input text,
  process_image_url_input text,
  final_image_url_input text,
  before_image_label_input text,
  process_image_label_input text,
  final_image_label_input text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  if not private.can_manage_barbershop_as(target_id, array['owner']) then
    raise exception 'Apenas o dono pode alterar a aparencia desta barbearia.';
  end if;

  perform public.assert_feature(target_slug, 'temas_personalizados');

  update public.barbershops
  set
    logo_url = nullif(logo_url_input, ''),
    theme_color = coalesce(nullif(theme_color_input, ''), theme_color),
    client_background_url = nullif(client_background_url_input, ''),
    admin_background_url = nullif(admin_background_url_input, ''),
    client_background_opacity = least(greatest(coalesce(client_background_opacity_input, 0.18), 0), 0.7),
    admin_background_opacity = least(greatest(coalesce(admin_background_opacity_input, 0.12), 0), 0.7),
    before_image_url = nullif(before_image_url_input, ''),
    process_image_url = nullif(process_image_url_input, ''),
    final_image_url = nullif(final_image_url_input, ''),
    before_image_label = coalesce(nullif(before_image_label_input, ''), 'Antes'),
    process_image_label = coalesce(nullif(process_image_label_input, ''), 'Processo'),
    final_image_label = coalesce(nullif(final_image_label_input, ''), 'Finalizado'),
    updated_at = now()
  where id = target_id;
end;
$$;

create or replace function public.save_promotions(
  target_slug text,
  promotions_input jsonb
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  target_id uuid;
  sanitized_promotions jsonb;
  first_promotion jsonb;
begin
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  if not private.can_manage_barbershop_as(target_id, array['owner']) then
    raise exception 'Apenas o dono pode alterar as promocoes desta barbearia.';
  end if;

  perform public.assert_feature(target_slug, 'promotions');

  with raw_promotions as (
    select value, ordinality
    from jsonb_array_elements(coalesce(promotions_input, '[]'::jsonb)) with ordinality
    limit 20
  ),
  cleaned as (
    select jsonb_build_object(
      'id', coalesce(nullif(value->>'id', ''), 'promo-' || ordinality::text),
      'title', coalesce(nullif(trim(value->>'title'), ''), 'Promocao'),
      'description', coalesce(nullif(trim(value->>'description'), ''), ''),
      'type',
        case
          when lower(coalesce(value->>'type', value->>'mode', value->>'kind', 'discount')) = 'price'
            then 'price'
          else 'discount'
        end,
      'discountPercent', greatest(
        0,
        least(
          case
            when coalesce(value->>'discountPercent', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
              then (value->>'discountPercent')::numeric
            else 0
          end,
          80
        )
      ),
      'discountValue', greatest(
        0,
        case
          when coalesce(value->>'discountValue', value->>'discountAmount', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
            then coalesce(value->>'discountValue', value->>'discountAmount')::numeric
          else 0
        end
      ),
      'promotionalPrice', greatest(
        0,
        case
          when coalesce(value->>'promotionalPrice', value->>'promoPrice', value->>'price', value->>'value', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
            then coalesce(value->>'promotionalPrice', value->>'promoPrice', value->>'price', value->>'value')::numeric
          else 0
        end
      ),
      'active',
        case
          when lower(coalesce(value->>'active', 'true')) in ('false', '0', 'no', 'nao')
            then false
          else true
        end
    ) as promotion
    from raw_promotions
  )
  select coalesce(jsonb_agg(promotion), '[]'::jsonb)
  into sanitized_promotions
  from cleaned;

  first_promotion := sanitized_promotions->0;

  update public.barbershops
  set
    promotions = sanitized_promotions,
    promotion_title = coalesce(first_promotion->>'title', promotion_title),
    promotion_description = coalesce(first_promotion->>'description', promotion_description),
    promotion_discount = coalesce((first_promotion->>'discountPercent')::numeric, promotion_discount),
    updated_at = now()
  where id = target_id;
end;
$$;

grant execute on function public.save_background_settings(text, text, text, numeric, numeric) to authenticated;
grant execute on function public.save_appearance_media(text, text, text, text, text, text, text) to authenticated;
grant execute on function public.save_appearance_center(text, text, text, numeric, text) to authenticated;
grant execute on function public.save_premium_appearance(text, text, text, text, text, numeric, numeric, text, text, text, text, text, text) to authenticated;
grant execute on function public.save_promotions(text, jsonb) to authenticated;

create or replace function public.get_platform_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  current_month date := date_trunc('month', current_date)::date;
begin
  if not private.is_platform_admin_email(private.current_auth_email()) then
    raise exception 'Acesso restrito ao administrador da plataforma.';
  end if;

  select jsonb_build_object(
    'stats', jsonb_build_object(
      'total', count(*) filter (where shop.archived_at is null),
      'archived', count(*) filter (where shop.archived_at is not null),
      'active', count(*) filter (where account.monthly_status = 'active' and shop.archived_at is null),
      'trial', count(*) filter (where account.monthly_status = 'trial' and shop.archived_at is null),
      'overdue', count(*) filter (where account.monthly_status = 'overdue' and shop.archived_at is null),
      'blocked', count(*) filter (where account.monthly_status = 'blocked' and shop.archived_at is null),
      'cancelled', count(*) filter (where account.monthly_status = 'cancelled' and shop.archived_at is null),
      'mrr', coalesce(sum(account.plan_price) filter (where account.monthly_status = 'active' and shop.archived_at is null), 0),
      'monthly_revenue', coalesce(sum(account.plan_price) filter (where account.monthly_status in ('active', 'trial') and shop.archived_at is null), 0),
      'overdue_revenue', coalesce(sum(account.plan_price) filter (where account.monthly_status = 'overdue' and shop.archived_at is null), 0),
      'new_barbershops_month', count(*) filter (where shop.created_at >= current_month and shop.archived_at is null),
      'churn_month', count(*) filter (
        where account.monthly_status = 'cancelled'
          and coalesce(account.cancelled_at, account.updated_at, shop.updated_at, shop.created_at) >= current_month
      ),
      'churn_risk', count(*) filter (
        where account.monthly_status = 'active'
          and shop.archived_at is null
          and not exists (
            select 1
            from public.appointments appointment
            where appointment.barbershop_id = shop.id
              and appointment.appointment_date >= current_date - 30
              and coalesce(appointment.status, '') <> 'cancelled'
          )
      ),
      'mrr_history', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'month', to_char(months.month_start, 'YYYY-MM'),
            'label', to_char(months.month_start, 'MM/YYYY'),
            'value', coalesce((
              select sum(history_account.plan_price)
              from public.barbershop_accounts history_account
              join public.barbershops history_shop on history_shop.id = history_account.barbershop_id
              where history_shop.archived_at is null
                and history_shop.created_at < months.month_start + interval '1 month'
                and history_account.monthly_status = 'active'
                and coalesce(history_account.cancelled_at, 'infinity'::timestamptz) >= months.month_start
            ), 0)
          )
          order by months.month_start
        ), '[]'::jsonb)
        from generate_series(
          date_trunc('month', current_date)::date - interval '5 months',
          date_trunc('month', current_date)::date,
          interval '1 month'
        ) as months(month_start)
      ),
      'next_billing', min(account.next_billing_date) filter (where shop.archived_at is null)
    ),
    'barbershops', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', shop.id,
        'name', shop.name,
        'slug', shop.slug,
        'whatsapp', shop.whatsapp,
        'address', shop.address,
        'created_at', shop.created_at,
        'updated_at', shop.updated_at,
        'owner_email', account.owner_email,
        'plan', account.plan,
        'plan_label', case private.plan_id_normalized(account.plan) when 'starter' then 'Inicial' when 'premium' then 'Premium' else 'Profissional' end,
        'plan_price', coalesce(account.plan_price, 0),
        'monthly_status', account.monthly_status,
        'status_label', case account.monthly_status when 'trial' then 'Teste de 30 dias' when 'pending' then 'Pendente' when 'overdue' then 'Pagamento atrasado' when 'blocked' then 'Bloqueado' when 'cancelled' then 'Cancelado' else 'Ativo' end,
        'next_billing_date', account.next_billing_date,
        'days_to_billing', account.next_billing_date - current_date,
        'pix_key', shop.pix_key,
        'theme_color', shop.theme_color,
        'features', coalesce((
          select jsonb_object_agg(flag.feature_key, jsonb_build_object('enabled', flag.enabled, 'released', flag.released))
          from public.feature_flags flag
          where flag.barbershop_id = shop.id
        ), '{}'::jsonb)
      )
      order by shop.created_at desc
    ) filter (where shop.archived_at is null), '[]'::jsonb)
  )
  into result
  from public.barbershops shop
  left join public.barbershop_accounts account on account.barbershop_id = shop.id;

  return result;
end;
$$;

grant execute on function public.save_platform_feature_flags(text, jsonb) to authenticated;
grant execute on function public.save_feature_flags(text, jsonb) to authenticated;
grant execute on function public.get_platform_dashboard() to authenticated;

-- Diagnostico rapido:
-- select public.has_feature('master', 'promotions');
-- select public.has_feature('master', 'commissions');
-- select public.get_platform_dashboard();
