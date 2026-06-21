-- AgendaPro SQL 14
-- Hierarquia definitiva de acesso:
-- Desenvolvedor: acesso total.
-- Dono: gerencia a propria barbearia e acessos de dono/funcionario.
-- Funcionario: agenda, clientes e acoes do atendimento.
--
-- Execute depois do SQL 13.

create schema if not exists private;

create or replace function private.current_auth_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', auth.email(), ''));
$$;

create or replace function private.normalized_barbershop_role(value text)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(value, '')) in ('platform', 'developer', 'desenvolvedor', 'plataforma') then 'platform'
    when lower(coalesce(value, '')) in ('owner', 'dono') then 'owner'
    else 'manager'
  end;
$$;

create table if not exists public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  active boolean not null default true,
  created_at timestamptz default now()
);

insert into public.platform_admins (email, active)
values ('dyoser2@gmail.com', true)
on conflict (email) do update set active = true;

create unique index if not exists barbershop_admins_shop_email_unique
on public.barbershop_admins (barbershop_id, email);

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

create or replace function private.can_manage_barbershop_as(
  target_barbershop_id uuid,
  allowed_roles text[]
)
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
        and (
          private.normalized_barbershop_role(admin.role) = 'platform'
          or private.normalized_barbershop_role(admin.role) = any(allowed_roles)
        )
    );
$$;

-- Garante que o desenvolvedor esteja vinculado a todas as barbearias.
insert into public.barbershop_admins (barbershop_id, email, role, active)
select shop.id, 'dyoser2@gmail.com', 'platform', true
from public.barbershops shop
on conflict (barbershop_id, email)
do update set role = 'platform', active = true;

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
    private.normalized_barbershop_role(admin.role),
    current_email
  from public.barbershop_admins admin
  join public.barbershops shop on shop.id = admin.barbershop_id
  where lower(admin.email) = current_email
    and coalesce(admin.active, true) = true
    and shop.archived_at is null
  order by
    case private.normalized_barbershop_role(admin.role)
      when 'platform' then 1
      when 'owner' then 2
      else 3
    end,
    admin.created_at
  limit 1;
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
    raise exception 'Acesso restrito ao desenvolvedor da plataforma.';
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
    lower(owner_email_input),
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

  insert into public.barbershop_admins (barbershop_id, email, role, active)
  values (new_shop_id, 'dyoser2@gmail.com', 'platform', true)
  on conflict (barbershop_id, email)
  do update set role = 'platform', active = true;

  insert into public.professionals (barbershop_id, name, active, fixed)
  values (new_shop_id, 'Primeiro disponivel', true, true);

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
  values (new_shop_id, 'Almoco', '12:00', '13:00');

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
    'link_cliente', 'https://calendarproapp.vercel.app/' || clean_slug,
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
    raise exception 'Acesso restrito ao desenvolvedor da plataforma.';
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
    lower(owner_email_input),
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

  insert into public.barbershop_admins (barbershop_id, email, role, active)
  values (target_id, 'dyoser2@gmail.com', 'platform', true)
  on conflict (barbershop_id, email)
  do update set role = 'platform', active = true;
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

  if not private.can_manage_barbershop_as(target_id, array['owner']) then
    raise exception 'Apenas o desenvolvedor ou o dono podem ver os acessos desta barbearia.';
  end if;

  return query
  select
    admin.id,
    admin.email,
    private.normalized_barbershop_role(admin.role),
    coalesce(admin.active, true) as active
  from public.barbershop_admins admin
  where admin.barbershop_id = target_id
  order by
    case private.normalized_barbershop_role(admin.role)
      when 'platform' then 1
      when 'owner' then 2
      else 3
    end,
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
  is_platform boolean;
begin
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  is_platform := private.is_platform_admin_email(private.current_auth_email());

  if not is_platform and not private.can_manage_barbershop_as(target_id, array['owner']) then
    raise exception 'Apenas o desenvolvedor ou o dono podem alterar acessos desta barbearia.';
  end if;

  update public.barbershop_admins
  set active = false
  where barbershop_id = target_id
    and private.normalized_barbershop_role(role) <> 'platform';

  for item in select * from jsonb_array_elements(coalesce(accesses_input, '[]'::jsonb))
  loop
    clean_email := lower(trim(item->>'email'));
    clean_role := private.normalized_barbershop_role(coalesce(nullif(item->>'role', ''), 'manager'));
    clean_active := coalesce((item->>'active')::boolean, true);

    if clean_email is null or clean_email = '' then
      continue;
    end if;

    if clean_role = 'platform' and not is_platform then
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

  insert into public.barbershop_admins (barbershop_id, email, role, active)
  values (target_id, 'dyoser2@gmail.com', 'platform', true)
  on conflict (barbershop_id, email)
  do update set role = 'platform', active = true;

  if not exists (
    select 1
    from public.barbershop_admins admin
    where admin.barbershop_id = target_id
      and admin.active = true
      and private.normalized_barbershop_role(admin.role) = 'owner'
  ) then
    raise exception 'A barbearia precisa manter pelo menos um dono ativo.';
  end if;
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
  is_platform boolean;
begin
  target_id := private.barbershop_id_by_slug(target_slug);
  next_slug := coalesce(nullif(slug_input, ''), target_slug);
  is_platform := private.is_platform_admin_email(private.current_auth_email());

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  if not private.can_manage_barbershop_as(target_id, array['owner']) then
    raise exception 'Apenas o desenvolvedor ou o dono podem alterar esta barbearia.';
  end if;

  update public.barbershops
  set
    name = name_input,
    slug = case when is_platform then next_slug else slug end,
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

  if is_platform then
    insert into public.barbershop_accounts (
      barbershop_id,
      owner_email,
      plan,
      monthly_status,
      next_billing_date
    ) values (
      target_id,
      lower(owner_email_input),
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
  end if;
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

  if not private.can_manage_barbershop_as(target_id, array['owner']) then
    raise exception 'Apenas o dono pode alterar os servicos desta barbearia.';
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

  if not private.can_manage_barbershop_as(target_id, array['owner']) then
    raise exception 'Apenas o dono pode alterar profissionais desta barbearia.';
  end if;

  update public.professionals
  set active = false, updated_at = now()
  where barbershop_id = target_id;

  for item in select * from jsonb_array_elements(coalesce(professionals_input, '[]'::jsonb))
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

  if not private.can_manage_barbershop_as(target_id, array['owner']) then
    raise exception 'Apenas o dono pode configurar a agenda real desta barbearia.';
  end if;

  update public.barbershops
  set slot_interval = greatest(coalesce(slot_interval_input, 30), 10),
      updated_at = now()
  where id = target_id;

  for item in select * from jsonb_array_elements(coalesce(working_hours_input, '[]'::jsonb))
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
  for item in select * from jsonb_array_elements(coalesce(breaks_input, '[]'::jsonb))
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
  for item in select * from jsonb_array_elements(coalesce(days_off_input, '[]'::jsonb))
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
  for item in select * from jsonb_array_elements(coalesce(blocks_input, '[]'::jsonb))
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

revoke execute on function public.get_my_admin_context() from public, anon;
revoke execute on function public.create_barbershop_full(text, text, text, text, text, text, date, text, text, text) from public, anon;
revoke execute on function public.update_platform_barbershop(text, text, text, text, text, text, date, text, text, text, numeric) from public, anon;
revoke execute on function public.get_barbershop_accesses(text) from public, anon;
revoke execute on function public.save_barbershop_accesses(text, jsonb) from public, anon;
revoke execute on function public.save_business_settings(
  text, text, text, text, text, text, date, text, text, text, text, text, text, text,
  boolean, text, numeric, boolean, text, text, text, text, text, numeric, numeric
) from public, anon;
revoke execute on function public.save_services(text, jsonb) from public, anon;
revoke execute on function public.save_professionals(text, jsonb) from public, anon;
revoke execute on function public.save_schedule_settings(text, integer, jsonb, jsonb, jsonb, jsonb) from public, anon;

grant execute on function public.get_my_admin_context() to authenticated;
grant execute on function public.create_barbershop_full(text, text, text, text, text, text, date, text, text, text) to authenticated;
grant execute on function public.update_platform_barbershop(text, text, text, text, text, text, date, text, text, text, numeric) to authenticated;
grant execute on function public.get_barbershop_accesses(text) to authenticated;
grant execute on function public.save_barbershop_accesses(text, jsonb) to authenticated;
grant execute on function public.save_business_settings(
  text, text, text, text, text, text, date, text, text, text, text, text, text, text,
  boolean, text, numeric, boolean, text, text, text, text, text, numeric, numeric
) to authenticated;
grant execute on function public.save_services(text, jsonb) to authenticated;
grant execute on function public.save_professionals(text, jsonb) to authenticated;
grant execute on function public.save_schedule_settings(text, integer, jsonb, jsonb, jsonb, jsonb) to authenticated;
