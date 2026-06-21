-- AgendaPro - pacote completo de sincronização do Supabase.
-- Execute este arquivo inteiro no SQL Editor do Supabase.
-- Ele cria/atualiza as tabelas, dados base e funções RPC usadas pelo app.

create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.barbershops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  logo_text text default 'A',
  whatsapp text not null,
  address text,
  maps_url text,
  theme_color text default '#22c55e',
  theme_color_secondary text default '#4ade80',
  pix_enabled boolean default true,
  pix_key text,
  pix_discount numeric default 10,
  automatic_confirmation_enabled boolean default true,
  success_title text default 'Agendamento confirmado!',
  success_message text default 'Seu horário já está reservado.',
  success_footer text default 'A barbearia já recebeu os detalhes do atendimento.',
  slot_interval integer default 30,
  promotion_title text default 'Promoção online',
  promotion_description text default 'Desconto especial para agendamentos feitos pelo app.',
  promotion_discount numeric default 10,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.barbershops
  add column if not exists logo_url text,
  add column if not exists logo_text text default 'A',
  add column if not exists theme_color text default '#22c55e',
  add column if not exists theme_color_secondary text default '#4ade80',
  add column if not exists pix_enabled boolean default true,
  add column if not exists pix_key text,
  add column if not exists pix_discount numeric default 10,
  add column if not exists automatic_confirmation_enabled boolean default true,
  add column if not exists success_title text default 'Agendamento confirmado!',
  add column if not exists success_message text default 'Seu horário já está reservado.',
  add column if not exists success_footer text default 'A barbearia já recebeu os detalhes do atendimento.',
  add column if not exists slot_interval integer default 30,
  add column if not exists promotion_title text default 'Promoção online',
  add column if not exists promotion_description text default 'Desconto especial para agendamentos feitos pelo app.',
  add column if not exists promotion_discount numeric default 10,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create table if not exists public.barbershop_accounts (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  owner_email text not null,
  plan text not null default 'professional',
  monthly_status text not null default 'active',
  next_billing_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists barbershop_accounts_one_per_shop
on public.barbershop_accounts (barbershop_id);

create table if not exists public.barbershop_admins (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  user_id uuid,
  email text not null,
  role text not null default 'owner',
  active boolean default true,
  created_at timestamptz default now()
);

alter table public.barbershop_admins
  add column if not exists user_id uuid,
  add column if not exists active boolean default true,
  add column if not exists created_at timestamptz default now();

create unique index if not exists barbershop_admins_shop_email_unique
on public.barbershop_admins (barbershop_id, email);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null,
  duration integer not null default 30,
  price numeric not null default 0,
  active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.professionals (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null,
  active boolean default true,
  fixed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.professionals
  add column if not exists fixed boolean default false,
  add column if not exists updated_at timestamptz default now();

create table if not exists public.working_hours (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  week_day integer not null check (week_day between 0 and 6),
  enabled boolean default true,
  start_time time not null default '08:00',
  end_time time not null default '18:00'
);

create unique index if not exists working_hours_shop_day_unique
on public.working_hours (barbershop_id, week_day);

create table if not exists public.schedule_breaks (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null default 'Pausa',
  start_time time not null,
  end_time time not null,
  created_at timestamptz default now()
);

create table if not exists public.days_off (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  date date not null,
  reason text default 'Folga',
  created_at timestamptz default now()
);

create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  professional_id uuid references public.professionals(id) on delete set null,
  date date not null,
  start_time time not null,
  end_time time not null,
  reason text default 'Bloqueio manual',
  created_at timestamptz default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null,
  whatsapp text not null,
  visit_count integer default 0,
  last_service_text text,
  last_seen_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists clients_shop_whatsapp_unique
on public.clients (barbershop_id, whatsapp);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  client_name text not null,
  whatsapp text not null,
  service_text text not null,
  appointment_date date not null,
  appointment_time time not null,
  duration integer not null,
  total numeric not null default 0,
  payment_method text default 'local',
  paid boolean default false,
  status text default 'confirmed',
  reschedule_requested boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.appointments
  add column if not exists reschedule_requested boolean default false,
  add column if not exists updated_at timestamptz default now();

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  feature_key text not null,
  enabled boolean default false,
  released boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists feature_flags_shop_key_unique
on public.feature_flags (barbershop_id, feature_key);

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  client_name text not null,
  whatsapp text not null,
  preferred_date date not null,
  service_text text not null,
  status text not null default 'waiting',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.waitlist
  add column if not exists status text not null default 'waiting',
  add column if not exists updated_at timestamptz default now();

create or replace function private.safe_uuid(value text)
returns uuid
language plpgsql
as $$
begin
  return value::uuid;
exception
  when others then
    return null;
end;
$$;

create or replace function private.barbershop_id_by_slug(target_slug text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id
  from public.barbershops
  where slug = target_slug
  limit 1;
$$;

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
  automatic_confirmation_enabled,
  success_title,
  success_message,
  success_footer,
  promotion_title,
  promotion_description,
  promotion_discount,
  slot_interval
) values (
  'AgendaPro',
  'agenda-pro',
  'A',
  '5551996238323',
  'Rua Exemplo, 123 - Centro',
  'https://maps.google.com/',
  '#22c55e',
  '#4ade80',
  true,
  '51996238323',
  10,
  true,
  'Agendamento confirmado!',
  'Seu horário já está reservado.',
  'A barbearia já recebeu os detalhes do atendimento.',
  'Promoção online',
  'Desconto especial para agendamentos feitos pelo app.',
  10,
  30
)
on conflict (slug) do update set
  name = excluded.name,
  logo_text = excluded.logo_text,
  whatsapp = excluded.whatsapp,
  address = excluded.address,
  maps_url = excluded.maps_url,
  theme_color = excluded.theme_color,
  theme_color_secondary = excluded.theme_color_secondary,
  pix_enabled = excluded.pix_enabled,
  pix_key = excluded.pix_key,
  pix_discount = excluded.pix_discount,
  automatic_confirmation_enabled = excluded.automatic_confirmation_enabled,
  success_title = excluded.success_title,
  success_message = excluded.success_message,
  success_footer = excluded.success_footer,
  promotion_title = excluded.promotion_title,
  promotion_description = excluded.promotion_description,
  promotion_discount = excluded.promotion_discount,
  slot_interval = excluded.slot_interval,
  updated_at = now();

insert into public.barbershop_accounts (
  barbershop_id,
  owner_email,
  plan,
  monthly_status,
  next_billing_date
)
select
  id,
  'dyoser2@gmail.com',
  'professional',
  'active',
  current_date + 30
from public.barbershops
where slug = 'agenda-pro'
on conflict (barbershop_id)
do update set
  owner_email = excluded.owner_email,
  plan = excluded.plan,
  monthly_status = excluded.monthly_status,
  next_billing_date = excluded.next_billing_date,
  updated_at = now();

delete from public.barbershop_admins
where email in ('dyoser@app.com', 'admin@barbeariadojoao.com')
  and barbershop_id = private.barbershop_id_by_slug('agenda-pro');

insert into public.barbershop_admins (
  barbershop_id,
  email,
  role,
  active
)
select
  id,
  'dyoser2@gmail.com',
  'owner',
  true
from public.barbershops
where slug = 'agenda-pro'
on conflict (barbershop_id, email)
do update set
  role = 'owner',
  active = true;

insert into public.services (barbershop_id, name, duration, price, active, sort_order)
select shop.id, seed.name, seed.duration, seed.price, true, seed.sort_order
from public.barbershops shop
cross join (
  values
    ('Corte de cabelo', 30, 35::numeric, 1),
    ('Barba', 20, 25::numeric, 2),
    ('Sobrancelha', 10, 15::numeric, 3),
    ('Descoloração', 90, 120::numeric, 4),
    ('Coloração', 70, 100::numeric, 5)
) as seed(name, duration, price, sort_order)
where shop.slug = 'agenda-pro'
  and not exists (
    select 1
    from public.services service
    where service.barbershop_id = shop.id
      and service.name = seed.name
  );

insert into public.professionals (barbershop_id, name, active, fixed)
select shop.id, 'Primeiro disponível', true, true
from public.barbershops shop
where shop.slug = 'agenda-pro'
  and not exists (
    select 1
    from public.professionals professional
    where professional.barbershop_id = shop.id
      and professional.fixed = true
  );

insert into public.working_hours (barbershop_id, week_day, enabled, start_time, end_time)
select
  shop.id,
  day,
  day <> 0,
  '08:00'::time,
  case when day = 6 then '16:00'::time else '18:00'::time end
from public.barbershops shop
cross join generate_series(0, 6) as day
where shop.slug = 'agenda-pro'
on conflict (barbershop_id, week_day)
do update set
  enabled = excluded.enabled,
  start_time = excluded.start_time,
  end_time = excluded.end_time;

insert into public.schedule_breaks (barbershop_id, name, start_time, end_time)
select shop.id, 'Almoço', '12:00'::time, '13:00'::time
from public.barbershops shop
where shop.slug = 'agenda-pro'
  and not exists (
    select 1
    from public.schedule_breaks break_item
    where break_item.barbershop_id = shop.id
  );

insert into public.feature_flags (barbershop_id, feature_key, enabled, released)
select shop.id, seed.feature_key, seed.enabled, seed.released
from public.barbershops shop
cross join (
  values
    ('pix', true, true),
    ('auto_confirmation', true, true),
    ('promotions', false, false),
    ('waitlist', false, false),
    ('loyalty', false, false),
    ('google_login', false, false),
    ('instagram_booking', false, false),
    ('unique_link', false, false)
) as seed(feature_key, enabled, released)
where shop.slug = 'agenda-pro'
on conflict (barbershop_id, feature_key)
do update set
  enabled = excluded.enabled,
  released = excluded.released,
  updated_at = now();

alter table public.barbershops enable row level security;
alter table public.barbershop_accounts enable row level security;
alter table public.barbershop_admins enable row level security;
alter table public.services enable row level security;
alter table public.professionals enable row level security;
alter table public.working_hours enable row level security;
alter table public.schedule_breaks enable row level security;
alter table public.days_off enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.feature_flags enable row level security;
alter table public.waitlist enable row level security;

drop policy if exists "agendapro public read barbershops" on public.barbershops;
create policy "agendapro public read barbershops"
on public.barbershops for select to anon, authenticated using (true);

drop policy if exists "agendapro public read accounts" on public.barbershop_accounts;
create policy "agendapro public read accounts"
on public.barbershop_accounts for select to anon, authenticated using (true);

drop policy if exists "agendapro public read admins" on public.barbershop_admins;
create policy "agendapro public read admins"
on public.barbershop_admins for select to anon, authenticated using (true);

drop policy if exists "agendapro public read services" on public.services;
create policy "agendapro public read services"
on public.services for select to anon, authenticated using (true);

drop policy if exists "agendapro public read professionals" on public.professionals;
create policy "agendapro public read professionals"
on public.professionals for select to anon, authenticated using (true);

drop policy if exists "agendapro public read working hours" on public.working_hours;
create policy "agendapro public read working hours"
on public.working_hours for select to anon, authenticated using (true);

drop policy if exists "agendapro public read breaks" on public.schedule_breaks;
create policy "agendapro public read breaks"
on public.schedule_breaks for select to anon, authenticated using (true);

drop policy if exists "agendapro public read days off" on public.days_off;
create policy "agendapro public read days off"
on public.days_off for select to anon, authenticated using (true);

drop policy if exists "agendapro public read blocks" on public.schedule_blocks;
create policy "agendapro public read blocks"
on public.schedule_blocks for select to anon, authenticated using (true);

drop policy if exists "agendapro public read appointments" on public.appointments;
create policy "agendapro public read appointments"
on public.appointments for select to anon, authenticated using (true);

drop policy if exists "agendapro public read clients" on public.clients;
create policy "agendapro public read clients"
on public.clients for select to anon, authenticated using (true);

drop policy if exists "agendapro public read feature flags" on public.feature_flags;
create policy "agendapro public read feature flags"
on public.feature_flags for select to anon, authenticated using (true);

drop policy if exists "agendapro public read waitlist" on public.waitlist;
create policy "agendapro public read waitlist"
on public.waitlist for select to anon, authenticated using (true);

create or replace function public.get_client_history(
  target_slug text,
  target_whatsapp text
)
returns table (
  client_name text,
  last_service_text text,
  visit_count integer
)
language sql
security definer
set search_path = public
as $$
  select clients.name, clients.last_service_text, clients.visit_count
  from public.clients
  join public.barbershops on barbershops.id = clients.barbershop_id
  join public.barbershop_accounts on barbershop_accounts.barbershop_id = barbershops.id
  where barbershops.slug = target_slug
    and barbershop_accounts.monthly_status <> 'blocked'
    and clients.whatsapp = regexp_replace(target_whatsapp, '\D', '', 'g')
  limit 1;
$$;

create or replace function public.get_admin_appointments(target_slug text)
returns setof public.appointments
language sql
security definer
set search_path = public
as $$
  select appointments.*
  from public.appointments
  join public.barbershops
    on barbershops.id = appointments.barbershop_id
  where barbershops.slug = target_slug
  order by appointments.appointment_date, appointments.appointment_time;
$$;

create or replace function public.get_admin_clients(target_slug text)
returns setof public.clients
language sql
security definer
set search_path = public
as $$
  select clients.*
  from public.clients
  join public.barbershops
    on barbershops.id = clients.barbershop_id
  where barbershops.slug = target_slug
  order by clients.visit_count desc, clients.last_seen_at desc nulls last;
$$;

create or replace function public.get_barbershop_accesses(target_slug text)
returns table (
  id uuid,
  email text,
  role text,
  active boolean
)
language sql
security definer
set search_path = public
as $$
  select
    admin.id,
    admin.email,
    admin.role,
    coalesce(admin.active, true) as active
  from public.barbershop_admins admin
  join public.barbershops shop
    on shop.id = admin.barbershop_id
  where shop.slug = target_slug
  order by
    case admin.role
      when 'owner' then 1
      when 'platform' then 2
      else 3
    end,
    admin.email;
$$;

create or replace function public.book_appointment(
  target_slug text,
  client_name_input text,
  whatsapp_input text,
  professional_name_input text,
  service_text_input text,
  appointment_date_input date,
  appointment_time_input time,
  duration_input integer,
  total_input numeric,
  payment_method_input text,
  paid_input boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_barbershop_id uuid;
  target_client_id uuid;
  target_professional_id uuid;
  new_appointment_id uuid;
  clean_whatsapp text;
begin
  clean_whatsapp := regexp_replace(whatsapp_input, '\D', '', 'g');
  target_barbershop_id := private.barbershop_id_by_slug(target_slug);

  if target_barbershop_id is null then
    raise exception 'Agenda indisponível para este estabelecimento.';
  end if;

  select professionals.id into target_professional_id
  from public.professionals
  where professionals.barbershop_id = target_barbershop_id
    and professionals.name = professional_name_input
  limit 1;

  insert into public.clients (
    barbershop_id,
    name,
    whatsapp,
    visit_count,
    last_service_text,
    last_seen_at
  ) values (
    target_barbershop_id,
    client_name_input,
    clean_whatsapp,
    1,
    service_text_input,
    now()
  )
  on conflict (barbershop_id, whatsapp)
  do update set
    name = excluded.name,
    visit_count = public.clients.visit_count + 1,
    last_service_text = excluded.last_service_text,
    last_seen_at = now(),
    updated_at = now()
  returning id into target_client_id;

  insert into public.appointments (
    barbershop_id,
    client_id,
    professional_id,
    client_name,
    whatsapp,
    service_text,
    appointment_date,
    appointment_time,
    duration,
    total,
    payment_method,
    paid,
    status,
    reschedule_requested
  ) values (
    target_barbershop_id,
    target_client_id,
    target_professional_id,
    client_name_input,
    clean_whatsapp,
    service_text_input,
    appointment_date_input,
    appointment_time_input,
    duration_input,
    total_input,
    payment_method_input,
    paid_input,
    'confirmed',
    false
  )
  returning id into new_appointment_id;

  return new_appointment_id;
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
  success_footer_input text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  final_slug text;
begin
  final_slug := coalesce(nullif(slug_input, ''), target_slug);
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia não encontrada.';
  end if;

  update public.barbershops
  set
    name = name_input,
    slug = final_slug,
    logo_text = logo_text_input,
    logo_url = logo_url_input,
    whatsapp = whatsapp_input,
    address = address_input,
    maps_url = maps_url_input,
    theme_color = theme_color_input,
    theme_color_secondary = theme_color_secondary_input,
    pix_enabled = pix_enabled_input,
    pix_key = pix_key_input,
    pix_discount = greatest(0, least(coalesce(pix_discount_input, 0), 80)),
    automatic_confirmation_enabled = automatic_confirmation_enabled_input,
    success_title = success_title_input,
    success_message = success_message_input,
    success_footer = success_footer_input,
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
    lower(trim(owner_email_input)),
    coalesce(nullif(plan_input, ''), 'professional'),
    coalesce(nullif(monthly_status_input, ''), 'active'),
    next_billing_date_input
  )
  on conflict (barbershop_id)
  do update set
    owner_email = excluded.owner_email,
    plan = excluded.plan,
    monthly_status = excluded.monthly_status,
    next_billing_date = excluded.next_billing_date,
    updated_at = now();

  insert into public.barbershop_admins (
    barbershop_id,
    email,
    role,
    active
  ) values (
    target_id,
    lower(trim(owner_email_input)),
    'owner',
    true
  )
  on conflict (barbershop_id, email)
  do update set
    role = 'owner',
    active = true;

  return target_id;
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
    raise exception 'Barbearia não encontrada.';
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
    raise exception 'AgendaPro não encontrado.';
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
    raise exception 'Barbearia não encontrada.';
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
    raise exception 'Barbearia não encontrada.';
  end if;

  update public.services
  set active = false, updated_at = now()
  where barbershop_id = target_id;

  for item in select * from jsonb_array_elements(services_input)
  loop
    item_id := private.safe_uuid(item->>'id');

    if item_id is not null and exists (
      select 1 from public.services where id = item_id and barbershop_id = target_id
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
        and barbershop_id = target_id;
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
    raise exception 'Barbearia não encontrada.';
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
    raise exception 'Barbearia não encontrada.';
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
    raise exception 'Barbearia não encontrada.';
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

create or replace function public.join_waitlist(
  target_slug text,
  client_name_input text,
  whatsapp_input text,
  preferred_date_input date,
  service_text_input text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  new_waitlist_id uuid;
  clean_whatsapp text;
begin
  clean_whatsapp := regexp_replace(whatsapp_input, '\D', '', 'g');
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia não encontrada.';
  end if;

  insert into public.waitlist (
    barbershop_id,
    client_name,
    whatsapp,
    preferred_date,
    service_text,
    status
  ) values (
    target_id,
    client_name_input,
    clean_whatsapp,
    preferred_date_input,
    service_text_input,
    'waiting'
  )
  returning id into new_waitlist_id;

  return new_waitlist_id;
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
    raise exception 'Barbearia não encontrada.';
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

grant execute on function public.get_client_history(text, text) to anon, authenticated;
grant execute on function public.get_admin_appointments(text) to anon, authenticated;
grant execute on function public.get_admin_clients(text) to anon, authenticated;
grant execute on function public.get_barbershop_accesses(text) to anon, authenticated;

grant execute on function public.book_appointment(
  text, text, text, text, text, date, time, integer, numeric, text, boolean
) to anon, authenticated;

grant execute on function public.save_business_settings(
  text, text, text, text, text, text, date, text, text, text, text, text, text, text,
  boolean, text, numeric, boolean, text, text, text
) to anon, authenticated;

grant execute on function public.save_promotion_settings(text, text, text, numeric) to anon, authenticated;
grant execute on function public.save_barbershop_accesses(text, jsonb) to anon, authenticated;
grant execute on function public.save_feature_flags(text, jsonb) to anon, authenticated;
grant execute on function public.save_services(text, jsonb) to anon, authenticated;
grant execute on function public.save_professionals(text, jsonb) to anon, authenticated;
grant execute on function public.save_schedule_settings(text, integer, jsonb, jsonb, jsonb, jsonb) to anon, authenticated;
grant execute on function public.update_appointment_action(text, uuid, boolean, text, boolean) to anon, authenticated;
grant execute on function public.join_waitlist(text, text, text, date, text) to anon, authenticated;
grant execute on function public.update_waitlist_status(text, uuid, text) to anon, authenticated;

select
  shop.slug,
  shop.name,
  account.owner_email,
  count(distinct service.id) as servicos,
  count(distinct professional.id) as profissionais,
  count(distinct flag.id) as melhorias
from public.barbershops shop
left join public.barbershop_accounts account
  on account.barbershop_id = shop.id
left join public.services service
  on service.barbershop_id = shop.id
left join public.professionals professional
  on professional.barbershop_id = shop.id
left join public.feature_flags flag
  on flag.barbershop_id = shop.id
where shop.slug = 'agenda-pro'
group by shop.slug, shop.name, account.owner_email;
