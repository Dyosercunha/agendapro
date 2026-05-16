-- AgendaPro - servicos, fundos personalizados, login Google e seguranca.
-- Execute este arquivo no SQL Editor do Supabase depois dos updates 09 e 10.

create extension if not exists pgcrypto;
create schema if not exists private;

alter table public.services
  add column if not exists deleted_at timestamptz;

create index if not exists services_shop_visible_order_idx
on public.services (barbershop_id, deleted_at, active, sort_order);

alter table public.barbershops
  add column if not exists client_background_url text,
  add column if not exists admin_background_url text,
  add column if not exists client_background_opacity numeric default 0.18,
  add column if not exists admin_background_opacity numeric default 0.12,
  add column if not exists before_image_url text,
  add column if not exists process_image_url text,
  add column if not exists final_image_url text,
  add column if not exists before_image_label text default 'Antes',
  add column if not exists process_image_label text default 'Processo',
  add column if not exists final_image_label text default 'Finalizado',
  add column if not exists pro_service_delete_enabled boolean default true,
  add column if not exists pro_backplate_enabled boolean default false,
  add column if not exists pro_appearance_media_enabled boolean default false,
  add column if not exists pro_promotions_enabled boolean default false,
  add column if not exists pro_loyalty_enabled boolean default false,
  add column if not exists pro_waitlist_enabled boolean default false,
  add column if not exists pro_instagram_enabled boolean default false,
  add column if not exists pro_google_client_enabled boolean default false,
  add column if not exists promotion_active boolean default false,
  add column if not exists promotion_start_date date,
  add column if not exists promotion_end_date date,
  add column if not exists loyalty_enabled boolean default false,
  add column if not exists loyalty_reward_description text,
  add column if not exists loyalty_visit_goal integer default 5,
  add column if not exists loyalty_discount numeric default 20,
  add column if not exists instagram_url text,
  add column if not exists google_client_login_enabled boolean default false,
  add column if not exists archived_at timestamptz;

alter table public.barbershop_accounts
  add column if not exists plan_price numeric default 89,
  add column if not exists billing_reminder_sent_at timestamptz;

alter table public.clients
  add column if not exists loyalty_points integer default 0;

create table if not exists public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  active boolean not null default true,
  created_at timestamptz default now()
);

insert into public.platform_admins (email, active)
values ('dyoser2@gmail.com', true)
on conflict (email) do update set active = excluded.active;

alter table public.platform_admins enable row level security;
revoke all on table public.platform_admins from anon, authenticated;

create or replace function private.current_auth_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', auth.email(), ''));
$$;

create or replace function private.is_platform_admin_email(target_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins admin
    where lower(admin.email) = lower(coalesce(target_email, ''))
      and admin.active = true
  );
$$;

create or replace function private.can_manage_barbershop(target_barbershop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    private.is_platform_admin_email(private.current_auth_email())
    or exists (
      select 1
      from public.barbershop_admins admin
      where admin.barbershop_id = target_barbershop_id
        and lower(admin.email) = private.current_auth_email()
        and coalesce(admin.active, true) = true
    );
$$;

drop policy if exists "agendapro platform admins own platform read" on public.platform_admins;
create policy "agendapro platform admins own platform read"
on public.platform_admins
for select
to authenticated
using (private.is_platform_admin_email(private.current_auth_email()));

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select private.is_platform_admin_email(private.current_auth_email());
$$;

create or replace function public.get_my_admin_context()
returns table (
  access_type text,
  barbershop_id uuid,
  slug text,
  role text,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;
begin
  current_email := private.current_auth_email();

  if current_email = '' then
    return;
  end if;

  if private.is_platform_admin_email(current_email) then
    return query
    select 'platform'::text, null::uuid, null::text, 'platform'::text, current_email;
    return;
  end if;

  return query
  select
    'barbershop'::text,
    shop.id,
    shop.slug,
    admin.role,
    current_email
  from public.barbershop_admins admin
  join public.barbershops shop on shop.id = admin.barbershop_id
  where lower(admin.email) = current_email
    and coalesce(admin.active, true) = true
    and shop.archived_at is null
  order by
    case admin.role when 'owner' then 1 when 'manager' then 2 else 3 end,
    admin.created_at
  limit 1;
end;
$$;

create or replace function public.save_services(
  target_slug text,
  services_input jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  item jsonb;
  item_id uuid;
begin
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  if not private.can_manage_barbershop(target_id) then
    raise exception 'Voce nao tem permissao para alterar os servicos desta barbearia.';
  end if;

  update public.services
  set active = false, updated_at = now()
  where barbershop_id = target_id
    and deleted_at is null;

  for item in select * from jsonb_array_elements(coalesce(services_input, '[]'::jsonb))
  loop
    if coalesce((item->>'deleted_at'), (item->>'deletedAt')) is not null then
      continue;
    end if;

    item_id := private.safe_uuid(item->>'id');

    if item_id is not null and exists (
      select 1
      from public.services
      where id = item_id
        and barbershop_id = target_id
        and deleted_at is null
    ) then
      update public.services
      set
        name = item->>'name',
        duration = coalesce((item->>'duration')::integer, 30),
        price = coalesce((item->>'price')::numeric, 0),
        active = coalesce((item->>'active')::boolean, true),
        sort_order = coalesce((item->>'sort_order')::integer, 0),
        updated_at = now()
      where id = item_id
        and barbershop_id = target_id
        and deleted_at is null;
    else
      insert into public.services (
        barbershop_id,
        name,
        duration,
        price,
        active,
        sort_order
      ) values (
        target_id,
        item->>'name',
        coalesce((item->>'duration')::integer, 30),
        coalesce((item->>'price')::numeric, 0),
        coalesce((item->>'active')::boolean, true),
        coalesce((item->>'sort_order')::integer, 0)
      );
    end if;
  end loop;
end;
$$;

create or replace function public.soft_delete_service(
  target_slug text,
  service_id_input uuid
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

  if not private.can_manage_barbershop(target_id) then
    raise exception 'Voce nao tem permissao para excluir servicos desta barbearia.';
  end if;

  update public.services
  set deleted_at = now(),
      active = false,
      updated_at = now()
  where id = service_id_input
    and barbershop_id = target_id
    and deleted_at is null;
end;
$$;

create or replace function public.soft_delete_service_by_name(
  target_slug text,
  service_name_input text
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

  if not private.can_manage_barbershop(target_id) then
    raise exception 'Voce nao tem permissao para excluir servicos desta barbearia.';
  end if;

  update public.services
  set deleted_at = now(),
      active = false,
      updated_at = now()
  where barbershop_id = target_id
    and lower(name) = lower(service_name_input)
    and deleted_at is null;
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

  if not private.can_manage_barbershop(target_id) then
    raise exception 'Voce nao tem permissao para alterar a aparencia desta barbearia.';
  end if;

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

  if not private.can_manage_barbershop(target_id) then
    raise exception 'Voce nao tem permissao para alterar a aparencia desta barbearia.';
  end if;

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

create or replace function public.save_success_texts(
  target_slug text,
  success_title_input text,
  success_message_input text,
  success_footer_input text
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

  if not private.can_manage_barbershop(target_id) then
    raise exception 'Voce nao tem permissao para alterar os textos desta barbearia.';
  end if;

  update public.barbershops
  set
    success_title = coalesce(nullif(success_title_input, ''), success_title),
    success_message = coalesce(nullif(success_message_input, ''), success_message),
    success_footer = coalesce(nullif(success_footer_input, ''), success_footer),
    updated_at = now()
  where id = target_id;
end;
$$;

create or replace function public.save_business_settings(
  target_slug text,
  name_input text,
  slug_input text,
  owner_email_input text,
  plan_input text,
  monthly_status_input text,
  next_billing_date_input date,
  logo_text_input text,
  logo_url_input text,
  whatsapp_input text,
  address_input text,
  maps_url_input text,
  theme_color_input text,
  theme_color_secondary_input text,
  pix_enabled_input boolean,
  pix_key_input text,
  pix_discount_input numeric,
  automatic_confirmation_enabled_input boolean,
  success_title_input text,
  success_message_input text,
  success_footer_input text,
  client_background_url_input text default null,
  admin_background_url_input text default null,
  client_background_opacity_input numeric default 0.18,
  admin_background_opacity_input numeric default 0.12
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  next_slug text;
begin
  target_id := private.barbershop_id_by_slug(target_slug);
  next_slug := coalesce(nullif(slug_input, ''), target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  if not private.can_manage_barbershop(target_id) then
    raise exception 'Voce nao tem permissao para alterar esta barbearia.';
  end if;

  update public.barbershops
  set
    name = name_input,
    slug = next_slug,
    logo_text = logo_text_input,
    logo_url = nullif(logo_url_input, ''),
    whatsapp = whatsapp_input,
    address = address_input,
    maps_url = maps_url_input,
    theme_color = theme_color_input,
    theme_color_secondary = theme_color_secondary_input,
    pix_enabled = pix_enabled_input,
    pix_key = pix_key_input,
    pix_discount = pix_discount_input,
    automatic_confirmation_enabled = automatic_confirmation_enabled_input,
    success_title = success_title_input,
    success_message = success_message_input,
    success_footer = success_footer_input,
    client_background_url = nullif(client_background_url_input, ''),
    admin_background_url = nullif(admin_background_url_input, ''),
    client_background_opacity = least(greatest(coalesce(client_background_opacity_input, 0.18), 0), 0.7),
    admin_background_opacity = least(greatest(coalesce(admin_background_opacity_input, 0.12), 0), 0.7),
    updated_at = now()
  where id = target_id;

  insert into public.barbershop_accounts (
    barbershop_id,
    owner_email,
    plan,
    monthly_status,
    next_billing_date
  ) values (
    target_id,
    owner_email_input,
    plan_input,
    monthly_status_input,
    next_billing_date_input
  )
  on conflict (barbershop_id)
  do update set
    owner_email = excluded.owner_email,
    plan = excluded.plan,
    monthly_status = excluded.monthly_status,
    next_billing_date = excluded.next_billing_date,
    updated_at = now();
end;
$$;

create or replace function public.get_platform_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not private.is_platform_admin_email(private.current_auth_email()) then
    raise exception 'Acesso restrito ao administrador da plataforma.';
  end if;

  select jsonb_build_object(
    'stats', jsonb_build_object(
      'total', count(*) filter (where shop.archived_at is null),
      'active', count(*) filter (where account.monthly_status = 'active' and shop.archived_at is null),
      'trial', count(*) filter (where account.monthly_status = 'trial' and shop.archived_at is null),
      'overdue', count(*) filter (where account.monthly_status = 'overdue' and shop.archived_at is null),
      'blocked', count(*) filter (where account.monthly_status = 'blocked' and shop.archived_at is null),
      'monthly_revenue', coalesce(sum(account.plan_price) filter (where account.monthly_status in ('active', 'trial') and shop.archived_at is null), 0),
      'overdue_revenue', coalesce(sum(account.plan_price) filter (where account.monthly_status = 'overdue' and shop.archived_at is null), 0),
      'next_billing', min(account.next_billing_date) filter (where shop.archived_at is null)
    ),
    'barbershops', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', shop.id,
        'name', shop.name,
        'slug', shop.slug,
        'whatsapp', shop.whatsapp,
        'address', shop.address,
        'owner_email', account.owner_email,
        'plan', account.plan,
        'plan_label', case account.plan when 'starter' then 'Inicial' when 'premium' then 'Premium' else 'Profissional' end,
        'plan_price', coalesce(account.plan_price, 0),
        'monthly_status', account.monthly_status,
        'status_label', case account.monthly_status when 'trial' then 'Teste de 30 dias' when 'overdue' then 'Pagamento atrasado' when 'blocked' then 'Desativado' else 'Ativo' end,
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

create or replace function public.create_barbershop_full(
  name_input text,
  slug_input text,
  whatsapp_input text,
  owner_email_input text,
  plan_input text,
  monthly_status_input text,
  next_billing_date_input date,
  address_input text,
  pix_key_input text,
  theme_color_input text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_shop_id uuid;
  clean_slug text;
  feature_key text;
begin
  if not private.is_platform_admin_email(private.current_auth_email()) then
    raise exception 'Acesso restrito ao administrador da plataforma.';
  end if;

  clean_slug := lower(regexp_replace(coalesce(nullif(slug_input, ''), name_input), '[^a-zA-Z0-9]+', '-', 'g'));
  clean_slug := trim(both '-' from clean_slug);

  insert into public.barbershops (
    name,
    slug,
    logo_text,
    whatsapp,
    address,
    maps_url,
    theme_color,
    theme_color_secondary,
    pix_enabled,
    pix_key,
    pix_discount,
    automatic_confirmation_enabled
  ) values (
    name_input,
    clean_slug,
    upper(left(name_input, 1)),
    whatsapp_input,
    address_input,
    'https://maps.google.com/',
    coalesce(nullif(theme_color_input, ''), '#22c55e'),
    '#4ade80',
    true,
    pix_key_input,
    10,
    true
  )
  returning id into new_shop_id;

  insert into public.barbershop_accounts (
    barbershop_id,
    owner_email,
    plan,
    monthly_status,
    next_billing_date,
    plan_price
  ) values (
    new_shop_id,
    owner_email_input,
    coalesce(nullif(plan_input, ''), 'professional'),
    coalesce(nullif(monthly_status_input, ''), 'trial'),
    next_billing_date_input,
    case coalesce(nullif(plan_input, ''), 'professional')
      when 'starter' then 49
      when 'premium' then 149
      else 89
    end
  );

  insert into public.barbershop_admins (barbershop_id, email, role, active)
  values (new_shop_id, lower(owner_email_input), 'owner', true)
  on conflict (barbershop_id, email)
  do update set role = 'owner', active = true;

  insert into public.professionals (barbershop_id, name, active, fixed)
  values (new_shop_id, 'Primeiro disponível', true, true);

  insert into public.services (barbershop_id, name, duration, price, active, sort_order)
  values
    (new_shop_id, 'Corte de cabelo', 30, 35, true, 1),
    (new_shop_id, 'Barba', 20, 25, true, 2),
    (new_shop_id, 'Sobrancelha', 10, 15, true, 3);

  insert into public.working_hours (barbershop_id, week_day, enabled, start_time, end_time)
  select new_shop_id, day_number, day_number between 1 and 6, '08:00'::time, case when day_number = 6 then '16:00'::time else '18:00'::time end
  from generate_series(0, 6) day_number
  on conflict (barbershop_id, week_day) do nothing;

  insert into public.schedule_breaks (barbershop_id, name, start_time, end_time)
  values (new_shop_id, 'Almoço', '12:00', '13:00');

  foreach feature_key in array array[
    'pix',
    'auto_confirmation',
    'promotions',
    'waitlist',
    'loyalty',
    'google_login',
    'instagram_booking',
    'unique_link',
    'service_delete',
    'backplate',
    'appearance_media',
    'google_client',
    'instagram'
  ]
  loop
    insert into public.feature_flags (barbershop_id, feature_key, enabled, released)
    values (new_shop_id, feature_key, feature_key in ('pix', 'auto_confirmation'), feature_key in ('pix', 'auto_confirmation'))
    on conflict (barbershop_id, feature_key) do nothing;
  end loop;

  return jsonb_build_object(
    'barbershop_id', new_shop_id,
    'slug', clean_slug,
    'link_cliente', 'https://calendarproapp.vercel.app/agendamento/' || clean_slug,
    'link_painel', 'https://calendarproapp.vercel.app/painel/' || clean_slug
  );
end;
$$;

create or replace function public.update_platform_barbershop(
  target_slug text,
  name_input text,
  whatsapp_input text,
  owner_email_input text,
  plan_input text,
  monthly_status_input text,
  next_billing_date_input date,
  address_input text,
  pix_key_input text,
  theme_color_input text,
  plan_price_input numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  if not private.is_platform_admin_email(private.current_auth_email()) then
    raise exception 'Acesso restrito ao administrador da plataforma.';
  end if;

  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  update public.barbershops
  set
    name = name_input,
    whatsapp = whatsapp_input,
    address = address_input,
    pix_key = pix_key_input,
    theme_color = coalesce(nullif(theme_color_input, ''), theme_color),
    updated_at = now()
  where id = target_id;

  insert into public.barbershop_accounts (
    barbershop_id,
    owner_email,
    plan,
    monthly_status,
    next_billing_date,
    plan_price
  ) values (
    target_id,
    owner_email_input,
    plan_input,
    monthly_status_input,
    next_billing_date_input,
    coalesce(plan_price_input, case plan_input when 'starter' then 49 when 'premium' then 149 else 89 end)
  )
  on conflict (barbershop_id)
  do update set
    owner_email = excluded.owner_email,
    plan = excluded.plan,
    monthly_status = excluded.monthly_status,
    next_billing_date = excluded.next_billing_date,
    plan_price = excluded.plan_price,
    updated_at = now();

  insert into public.barbershop_admins (barbershop_id, email, role, active)
  values (target_id, lower(owner_email_input), 'owner', true)
  on conflict (barbershop_id, email)
  do update set role = 'owner', active = true;
end;
$$;

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

create or replace function public.archive_platform_barbershop(target_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_platform_admin_email(private.current_auth_email()) then
    raise exception 'Acesso restrito ao administrador da plataforma.';
  end if;

  update public.barbershops
  set archived_at = now(), updated_at = now()
  where slug = target_slug;
end;
$$;

create or replace function public.soft_delete_platform_barbershop(target_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  select public.archive_platform_barbershop(target_slug);
$$;

create or replace function public.get_admin_waitlist(target_slug text)
returns table (
  id uuid,
  client_name text,
  whatsapp text,
  preferred_date date,
  service_text text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    return;
  end if;

  if not private.can_manage_barbershop(target_id) then
    raise exception 'Voce nao tem permissao para ver esta lista de espera.';
  end if;

  return query
  select wait.id, wait.client_name, wait.whatsapp, wait.preferred_date, wait.service_text, wait.status, wait.created_at
  from public.waitlist wait
  where wait.barbershop_id = target_id
  order by wait.created_at desc;
end;
$$;

create or replace function public.get_loyalty_clients(target_slug text)
returns table (
  id uuid,
  name text,
  whatsapp text,
  visit_count integer,
  loyalty_points integer,
  last_service_text text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    return;
  end if;

  if not private.can_manage_barbershop(target_id) then
    raise exception 'Voce nao tem permissao para ver estes clientes.';
  end if;

  return query
  select client.id, client.name, client.whatsapp, client.visit_count, coalesce(client.loyalty_points, 0), client.last_service_text
  from public.clients client
  where client.barbershop_id = target_id
  order by client.visit_count desc, client.last_seen_at desc nulls last;
end;
$$;

create or replace function public.get_barbershop_accesses(target_slug text)
returns table (
  id uuid,
  email text,
  role text,
  active boolean
)
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

  if not private.can_manage_barbershop(target_id) then
    raise exception 'Voce nao tem permissao para ver os acessos desta barbearia.';
  end if;

  return query
  select
    admin.id,
    admin.email,
    admin.role,
    coalesce(admin.active, true) as active
  from public.barbershop_admins admin
  where admin.barbershop_id = target_id
  order by
    case admin.role when 'owner' then 1 when 'platform' then 2 else 3 end,
    admin.email;
end;
$$;

create or replace function public.save_barbershop_accesses(
  target_slug text,
  accesses_input jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  item jsonb;
  item_id uuid;
  clean_email text;
  clean_role text;
  clean_active boolean;
begin
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  if not private.can_manage_barbershop(target_id) then
    raise exception 'Voce nao tem permissao para alterar os acessos desta barbearia.';
  end if;

  update public.barbershop_admins
  set active = false
  where barbershop_id = target_id;

  for item in select * from jsonb_array_elements(accesses_input)
  loop
    clean_email := lower(trim(item->>'email'));
    clean_role := coalesce(nullif(item->>'role', ''), 'manager');
    clean_active := coalesce((item->>'active')::boolean, true);

    if clean_email is null or clean_email = '' then
      continue;
    end if;

    item_id := private.safe_uuid(item->>'id');

    if item_id is not null and exists (
      select 1
      from public.barbershop_admins
      where id = item_id
        and barbershop_id = target_id
    ) then
      update public.barbershop_admins
      set email = clean_email,
          role = clean_role,
          active = clean_active
      where id = item_id
        and barbershop_id = target_id;
    else
      insert into public.barbershop_admins (
        barbershop_id,
        email,
        role,
        active
      ) values (
        target_id,
        clean_email,
        clean_role,
        clean_active
      )
      on conflict (barbershop_id, email)
      do update set
        role = excluded.role,
        active = excluded.active;
    end if;
  end loop;
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
begin
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  if not private.can_manage_barbershop(target_id) then
    raise exception 'Voce nao tem permissao para alterar as melhorias desta barbearia.';
  end if;

  for item in select * from jsonb_array_elements(features_input)
  loop
    insert into public.feature_flags (
      barbershop_id,
      feature_key,
      enabled,
      released
    ) values (
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
end;
$$;

create or replace function public.save_promotion_settings(
  target_slug text,
  promotion_title_input text,
  promotion_description_input text,
  promotion_discount_input numeric
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

  if not private.can_manage_barbershop(target_id) then
    raise exception 'Voce nao tem permissao para alterar as promocoes desta barbearia.';
  end if;

  update public.barbershops
  set
    promotion_title = nullif(trim(promotion_title_input), ''),
    promotion_description = coalesce(nullif(trim(promotion_description_input), ''), ''),
    promotion_discount = greatest(0, least(coalesce(promotion_discount_input, 0), 80)),
    updated_at = now()
  where id = target_id;
end;
$$;

create or replace function public.save_professionals(
  target_slug text,
  professionals_input jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  item jsonb;
  item_id uuid;
begin
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  if not private.can_manage_barbershop(target_id) then
    raise exception 'Voce nao tem permissao para alterar os profissionais desta barbearia.';
  end if;

  update public.professionals
  set active = false, updated_at = now()
  where barbershop_id = target_id;

  for item in select * from jsonb_array_elements(professionals_input)
  loop
    item_id := private.safe_uuid(item->>'id');

    if item_id is not null and exists (
      select 1 from public.professionals where id = item_id and barbershop_id = target_id
    ) then
      update public.professionals
      set
        name = item->>'name',
        active = coalesce((item->>'active')::boolean, true),
        fixed = coalesce((item->>'fixed')::boolean, false),
        updated_at = now()
      where id = item_id
        and barbershop_id = target_id;
    else
      insert into public.professionals (
        barbershop_id,
        name,
        active,
        fixed
      ) values (
        target_id,
        item->>'name',
        coalesce((item->>'active')::boolean, true),
        coalesce((item->>'fixed')::boolean, false)
      );
    end if;
  end loop;
end;
$$;

create or replace function public.save_schedule_settings(
  target_slug text,
  slot_interval_input integer,
  working_hours_input jsonb,
  breaks_input jsonb,
  days_off_input jsonb,
  blocks_input jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  item jsonb;
  target_professional_id uuid;
begin
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  if not private.can_manage_barbershop(target_id) then
    raise exception 'Voce nao tem permissao para alterar a agenda desta barbearia.';
  end if;

  update public.barbershops
  set slot_interval = greatest(coalesce(slot_interval_input, 30), 10),
      updated_at = now()
  where id = target_id;

  for item in select * from jsonb_array_elements(working_hours_input)
  loop
    insert into public.working_hours (
      barbershop_id,
      week_day,
      enabled,
      start_time,
      end_time
    ) values (
      target_id,
      (item->>'week_day')::integer,
      coalesce((item->>'enabled')::boolean, true),
      (item->>'start_time')::time,
      (item->>'end_time')::time
    )
    on conflict (barbershop_id, week_day)
    do update set
      enabled = excluded.enabled,
      start_time = excluded.start_time,
      end_time = excluded.end_time;
  end loop;

  delete from public.schedule_breaks where barbershop_id = target_id;
  for item in select * from jsonb_array_elements(breaks_input)
  loop
    insert into public.schedule_breaks (
      barbershop_id,
      name,
      start_time,
      end_time
    ) values (
      target_id,
      item->>'name',
      (item->>'start_time')::time,
      (item->>'end_time')::time
    );
  end loop;

  delete from public.days_off where barbershop_id = target_id;
  for item in select * from jsonb_array_elements(days_off_input)
  loop
    insert into public.days_off (
      barbershop_id,
      date,
      reason
    ) values (
      target_id,
      (item->>'date')::date,
      item->>'reason'
    );
  end loop;

  delete from public.schedule_blocks where barbershop_id = target_id;
  for item in select * from jsonb_array_elements(blocks_input)
  loop
    target_professional_id := null;

    if coalesce(item->>'professional_name', 'Todos') <> 'Todos' then
      select id into target_professional_id
      from public.professionals
      where barbershop_id = target_id
        and name = item->>'professional_name'
      limit 1;
    end if;

    insert into public.schedule_blocks (
      barbershop_id,
      professional_id,
      date,
      start_time,
      end_time,
      reason
    ) values (
      target_id,
      target_professional_id,
      (item->>'date')::date,
      (item->>'start_time')::time,
      (item->>'end_time')::time,
      item->>'reason'
    );
  end loop;
end;
$$;

create or replace function public.update_appointment_action(
  target_slug text,
  appointment_id_input uuid,
  paid_input boolean,
  status_input text,
  reschedule_requested_input boolean
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

  if not private.can_manage_barbershop(target_id) then
    raise exception 'Voce nao tem permissao para alterar agendamentos desta barbearia.';
  end if;

  update public.appointments
  set
    paid = coalesce(paid_input, paid),
    status = coalesce(status_input, status),
    reschedule_requested = coalesce(reschedule_requested_input, reschedule_requested),
    updated_at = now()
  where id = appointment_id_input
    and barbershop_id = target_id;
end;
$$;

create or replace function public.update_waitlist_status(
  target_slug text,
  waitlist_id_input uuid,
  status_input text
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

  if not private.can_manage_barbershop(target_id) then
    raise exception 'Voce nao tem permissao para alterar a lista de espera desta barbearia.';
  end if;

  if status_input = 'removed' then
    delete from public.waitlist
    where id = waitlist_id_input
      and barbershop_id = target_id;
  else
    update public.waitlist
    set
      status = status_input,
      updated_at = now()
    where id = waitlist_id_input
      and barbershop_id = target_id;
  end if;
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

  if not private.can_manage_barbershop(target_id) then
    raise exception 'Voce nao tem permissao para alterar a aparencia desta barbearia.';
  end if;

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

create or replace function public.get_platform_billing_reminders()
returns table (
  slug text,
  name text,
  whatsapp text,
  next_billing_date date,
  days_to_billing integer,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_platform_admin_email(private.current_auth_email()) then
    raise exception 'Apenas o administrador da plataforma pode enviar avisos de vencimento.';
  end if;

  return query
  select
    shop.slug,
    shop.name,
    regexp_replace(coalesce(shop.whatsapp, ''), '\D', '', 'g') as whatsapp,
    account.next_billing_date,
    (account.next_billing_date - current_date)::integer as days_to_billing,
    concat(
      'Ola! Passando para lembrar que sua assinatura AgendaPro vence em ',
      to_char(account.next_billing_date, 'DD/MM/YYYY'),
      '. Se precisar de ajuda, me chama por aqui.'
    ) as message
  from public.barbershops shop
  join public.barbershop_accounts account on account.barbershop_id = shop.id
  where shop.archived_at is null
    and account.next_billing_date is not null
    and account.monthly_status in ('active', 'trial', 'overdue')
    and account.next_billing_date between current_date and current_date + 3
    and regexp_replace(coalesce(shop.whatsapp, ''), '\D', '', 'g') <> ''
    and (
      account.billing_reminder_sent_at is null
      or account.billing_reminder_sent_at::date < current_date
    )
  order by account.next_billing_date, shop.name;
end;
$$;

create or replace function public.mark_billing_reminder_sent(target_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  if not private.is_platform_admin_email(private.current_auth_email()) then
    raise exception 'Apenas o administrador da plataforma pode marcar avisos.';
  end if;

  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  update public.barbershop_accounts
  set billing_reminder_sent_at = now(),
      updated_at = now()
  where barbershop_id = target_id;
end;
$$;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'barbershops'
      and policyname = 'agendapro barbershop admin update'
  ) then
    drop policy "agendapro barbershop admin update" on public.barbershops;
  end if;
end $$;

create policy "agendapro barbershop admin update"
on public.barbershops
for update
to authenticated
using (private.can_manage_barbershop(id))
with check (private.can_manage_barbershop(id));

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

drop policy if exists "agendapro public read admins" on public.barbershop_admins;
drop policy if exists "agendapro admin read admins" on public.barbershop_admins;
create policy "agendapro admin read admins"
on public.barbershop_admins
for select
to authenticated
using (private.can_manage_barbershop(barbershop_id));

drop policy if exists "agendapro public read services" on public.services;
drop policy if exists "agendapro public read visible services" on public.services;
create policy "agendapro public read visible services"
on public.services
for select
to anon, authenticated
using (deleted_at is null);

do $$
begin
  revoke execute on function public.save_business_settings(
    text, text, text, text, text, text, date, text, text, text, text, text, text, text,
    boolean, text, numeric, boolean, text, text, text, text, text, numeric, numeric
  ) from public, anon;
exception when undefined_function then
  null;
end $$;

revoke execute on function public.is_platform_admin() from public, anon;
revoke execute on function public.get_my_admin_context() from public, anon;
revoke execute on function public.get_platform_dashboard() from public, anon;
revoke execute on function public.create_barbershop_full(text, text, text, text, text, text, date, text, text, text) from public, anon;
revoke execute on function public.update_platform_barbershop(text, text, text, text, text, text, date, text, text, text, numeric) from public, anon;
revoke execute on function public.save_platform_feature_flags(text, jsonb) from public, anon;
revoke execute on function public.archive_platform_barbershop(text) from public, anon;
revoke execute on function public.soft_delete_platform_barbershop(text) from public, anon;
revoke execute on function public.get_barbershop_accesses(text) from public, anon;
revoke execute on function public.save_barbershop_accesses(text, jsonb) from public, anon;
revoke execute on function public.save_feature_flags(text, jsonb) from public, anon;
revoke execute on function public.save_promotion_settings(text, text, text, numeric) from public, anon;
revoke execute on function public.save_services(text, jsonb) from public, anon;
revoke execute on function public.save_professionals(text, jsonb) from public, anon;
revoke execute on function public.save_schedule_settings(text, integer, jsonb, jsonb, jsonb, jsonb) from public, anon;
revoke execute on function public.update_appointment_action(text, uuid, boolean, text, boolean) from public, anon;
revoke execute on function public.update_waitlist_status(text, uuid, text) from public, anon;
revoke execute on function public.soft_delete_service(text, uuid) from public, anon;
revoke execute on function public.soft_delete_service_by_name(text, text) from public, anon;
revoke execute on function public.save_background_settings(text, text, text, numeric, numeric) from public, anon;
revoke execute on function public.save_premium_appearance(text, text, text, text, text, numeric, numeric, text, text, text, text, text, text) from public, anon;
revoke execute on function public.save_success_texts(text, text, text, text) from public, anon;
revoke execute on function public.save_appearance_media(text, text, text, text, text, text, text) from public, anon;
revoke execute on function public.get_admin_waitlist(text) from public, anon;
revoke execute on function public.get_loyalty_clients(text) from public, anon;
revoke execute on function public.get_platform_billing_reminders() from public, anon;
revoke execute on function public.mark_billing_reminder_sent(text) from public, anon;

grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.get_my_admin_context() to authenticated;
grant execute on function public.get_platform_dashboard() to authenticated;
grant execute on function public.create_barbershop_full(text, text, text, text, text, text, date, text, text, text) to authenticated;
grant execute on function public.update_platform_barbershop(text, text, text, text, text, text, date, text, text, text, numeric) to authenticated;
grant execute on function public.save_platform_feature_flags(text, jsonb) to authenticated;
grant execute on function public.archive_platform_barbershop(text) to authenticated;
grant execute on function public.soft_delete_platform_barbershop(text) to authenticated;
grant execute on function public.save_business_settings(
  text, text, text, text, text, text, date, text, text, text, text, text, text, text,
  boolean, text, numeric, boolean, text, text, text, text, text, numeric, numeric
) to authenticated;
grant execute on function public.get_barbershop_accesses(text) to authenticated;
grant execute on function public.save_barbershop_accesses(text, jsonb) to authenticated;
grant execute on function public.save_feature_flags(text, jsonb) to authenticated;
grant execute on function public.save_promotion_settings(text, text, text, numeric) to authenticated;
grant execute on function public.save_services(text, jsonb) to authenticated;
grant execute on function public.save_professionals(text, jsonb) to authenticated;
grant execute on function public.save_schedule_settings(text, integer, jsonb, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.update_appointment_action(text, uuid, boolean, text, boolean) to authenticated;
grant execute on function public.update_waitlist_status(text, uuid, text) to authenticated;
grant execute on function public.soft_delete_service(text, uuid) to authenticated;
grant execute on function public.soft_delete_service_by_name(text, text) to authenticated;
grant execute on function public.save_background_settings(text, text, text, numeric, numeric) to authenticated;
grant execute on function public.save_premium_appearance(text, text, text, text, text, numeric, numeric, text, text, text, text, text, text) to authenticated;
grant execute on function public.save_success_texts(text, text, text, text) to authenticated;
grant execute on function public.save_appearance_media(text, text, text, text, text, text, text) to authenticated;
grant execute on function public.get_admin_waitlist(text) to authenticated;
grant execute on function public.get_loyalty_clients(text) to authenticated;
grant execute on function public.get_platform_billing_reminders() to authenticated;
grant execute on function public.mark_billing_reminder_sent(text) to authenticated;
