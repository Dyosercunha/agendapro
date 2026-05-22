-- AgendaPro SQL 20
-- Adiciona o novo e-mail administrativo e sincroniza todos os desenvolvedores
-- com todas as barbearias atuais e futuras.
--
-- Execute depois do SQL 19.

create schema if not exists private;

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

create unique index if not exists barbershop_admins_shop_email_unique
on public.barbershop_admins (barbershop_id, email);

insert into public.platform_admins (email, active)
values
  ('dyoser2@gmail.com', true),
  ('appagenda.pro@gmail.com', true)
on conflict (email) do update set active = true;

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

create or replace function private.sync_platform_admins_for_barbershop(target_barbershop_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_barbershop_id is null then
    return;
  end if;

  insert into public.barbershop_admins (
    barbershop_id,
    email,
    role,
    active
  )
  select
    target_barbershop_id,
    lower(admin.email),
    'platform',
    true
  from public.platform_admins admin
  where admin.active = true
  on conflict (barbershop_id, email)
  do update set
    role = 'platform',
    active = true;

  update public.barbershop_admins access
  set active = false
  where access.barbershop_id = target_barbershop_id
    and private.normalized_barbershop_role(access.role) = 'platform'
    and lower(access.email) not in (
      select lower(admin.email)
      from public.platform_admins admin
      where admin.active = true
    );
end;
$$;

create or replace function private.sync_platform_admins_for_barbershop_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.sync_platform_admins_for_barbershop(new.id);
  return new;
end;
$$;

drop trigger if exists agendapro_sync_platform_admins_on_shop on public.barbershops;

create trigger agendapro_sync_platform_admins_on_shop
after insert or update on public.barbershops
for each row
execute function private.sync_platform_admins_for_barbershop_trigger();

create or replace function private.sync_platform_admins_after_admin_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  shop record;
begin
  for shop in select id from public.barbershops loop
    perform private.sync_platform_admins_for_barbershop(shop.id);
  end loop;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists agendapro_sync_platform_admins_on_admin on public.platform_admins;

create trigger agendapro_sync_platform_admins_on_admin
after insert or update or delete on public.platform_admins
for each row
execute function private.sync_platform_admins_after_admin_change();

do $$
declare
  shop record;
begin
  for shop in select id from public.barbershops loop
    perform private.sync_platform_admins_for_barbershop(shop.id);
  end loop;
end;
$$;

select
  email,
  active
from public.platform_admins
where email in ('dyoser2@gmail.com', 'appagenda.pro@gmail.com')
order by email;
