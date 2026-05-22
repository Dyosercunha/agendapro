-- AgendaPro SQL 19
-- Endurecimento definitivo de cargos e RPCs sensiveis.
--
-- Execute depois do SQL 18.
--
-- Hierarquia:
-- - Platform/desenvolvedor: acesso total.
-- - Owner/dono: propria barbearia, aparencia, PIX/configuracoes, funcionarios e melhorias liberadas.
-- - Manager/funcionario: agenda, clientes e acoes operacionais do atendimento.
--
-- Observacao:
-- Este SQL remove leitura publica direta de dados sensiveis como clientes,
-- agendamentos, lista de espera e admins. O cliente continua usando RPCs publicas
-- seguras para agendar e verificar ocupacao sem expor dados pessoais.

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

insert into public.barbershop_admins (barbershop_id, email, role, active)
select shop.id, 'dyoser2@gmail.com', 'platform', true
from public.barbershops shop
on conflict (barbershop_id, email)
do update set role = 'platform', active = true;

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

create or replace function private.current_barbershop_role_by_id(target_barbershop_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when target_barbershop_id is null then 'none'
    when private.is_platform_admin_email(private.current_auth_email()) then 'platform'
    else coalesce((
      select private.normalized_barbershop_role(admin.role)
      from public.barbershop_admins admin
      join public.barbershops shop
        on shop.id = admin.barbershop_id
      where admin.barbershop_id = target_barbershop_id
        and lower(admin.email) = private.current_auth_email()
        and coalesce(admin.active, true) = true
        and shop.archived_at is null
      order by
        case private.normalized_barbershop_role(admin.role)
          when 'platform' then 1
          when 'owner' then 2
          else 3
        end,
        admin.created_at
      limit 1
    ), 'none')
  end;
$$;

create or replace function private.can_manage_barbershop(target_barbershop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.current_barbershop_role_by_id(target_barbershop_id) in ('platform', 'owner', 'manager');
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
    private.current_barbershop_role_by_id(target_barbershop_id) = 'platform'
    or private.current_barbershop_role_by_id(target_barbershop_id) = any(allowed_roles);
$$;

create or replace function private.can_manage_billing(target_barbershop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.current_barbershop_role_by_id(target_barbershop_id) = 'platform';
$$;

create or replace function private.can_manage_features(target_barbershop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.current_barbershop_role_by_id(target_barbershop_id) in ('platform', 'owner');
$$;

create or replace function public.current_barbershop_role(target_slug text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select private.current_barbershop_role_by_id(private.barbershop_id_by_slug(target_slug));
$$;

create or replace function public.can_manage_barbershop(target_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.can_manage_barbershop(private.barbershop_id_by_slug(target_slug));
$$;

create or replace function public.can_manage_billing(target_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.can_manage_billing(private.barbershop_id_by_slug(target_slug));
$$;

create or replace function public.can_manage_features(target_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.can_manage_features(private.barbershop_id_by_slug(target_slug));
$$;

create or replace function public.get_admin_appointments(target_slug text)
returns setof public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  can_view_private boolean;
  appointment public.appointments%rowtype;
begin
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    return;
  end if;

  can_view_private := private.can_manage_barbershop(target_id);

  for appointment in
    select *
    from public.appointments item
    where item.barbershop_id = target_id
      and coalesce(item.status, 'confirmed') <> 'cancelled'
    order by item.appointment_date, item.appointment_time
  loop
    if not can_view_private then
      appointment.client_id := null;
      appointment.client_name := 'Cliente';
      appointment.whatsapp := '';
      appointment.service_text := 'Ocupado';
      appointment.total := 0;
      appointment.payment_method := 'local';
      appointment.paid := false;
      appointment.reschedule_requested := false;
      appointment.public_token := '';
      appointment.customer_note := null;
    end if;

    return next appointment;
  end loop;
end;
$$;

create or replace function public.get_admin_clients(target_slug text)
returns setof public.clients
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
    raise exception 'Voce nao tem permissao para ver clientes desta barbearia.';
  end if;

  return query
  select client.*
  from public.clients client
  where client.barbershop_id = target_id
  order by client.visit_count desc, client.last_seen_at desc nulls last;
end;
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
  current_role text;
begin
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  current_role := private.current_barbershop_role_by_id(target_id);

  if current_role not in ('platform', 'owner', 'manager') then
    raise exception 'Voce nao tem permissao para alterar agendamentos desta barbearia.';
  end if;

  update public.appointments
  set
    paid = case
      when current_role in ('platform', 'owner') then coalesce(paid_input, paid)
      else paid
    end,
    status = case
      when status_input in ('confirmed', 'cancelled', 'completed', 'no_show') then status_input
      when status_input is null then status
      else status
    end,
    reschedule_requested = coalesce(reschedule_requested_input, reschedule_requested),
    cancelled_at = case
      when status_input = 'cancelled' and cancelled_at is null then now()
      else cancelled_at
    end,
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
      status = coalesce(nullif(status_input, ''), status),
      updated_at = now()
    where id = waitlist_id_input
      and barbershop_id = target_id;
  end if;
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
    if current_role = 'platform' then
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
    else
      update public.feature_flags
      set
        enabled = coalesce((item->>'enabled')::boolean, false),
        updated_at = now()
      where barbershop_id = target_id
        and feature_key = item->>'feature_key'
        and released = true;
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

alter table public.barbershop_admins enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.waitlist enable row level security;

drop policy if exists "agendapro public read admins" on public.barbershop_admins;
drop policy if exists "agendapro admin read admins" on public.barbershop_admins;
create policy "agendapro admin read admins"
on public.barbershop_admins
for select
to authenticated
using (private.can_manage_barbershop_as(barbershop_id, array['owner']));

drop policy if exists "agendapro public read appointments" on public.appointments;
drop policy if exists "agendapro admin read appointments" on public.appointments;
create policy "agendapro admin read appointments"
on public.appointments
for select
to authenticated
using (private.can_manage_barbershop(barbershop_id));

drop policy if exists "agendapro public read clients" on public.clients;
drop policy if exists "agendapro admin read clients" on public.clients;
create policy "agendapro admin read clients"
on public.clients
for select
to authenticated
using (private.can_manage_barbershop(barbershop_id));

drop policy if exists "agendapro public read waitlist" on public.waitlist;
drop policy if exists "agendapro admin read waitlist" on public.waitlist;
create policy "agendapro admin read waitlist"
on public.waitlist
for select
to authenticated
using (private.can_manage_barbershop(barbershop_id));

revoke select on public.barbershop_admins from anon;
revoke select on public.appointments from anon;
revoke select on public.clients from anon;
revoke select on public.waitlist from anon;

grant select on public.barbershop_admins to authenticated;
grant select on public.appointments to authenticated;
grant select on public.clients to authenticated;
grant select on public.waitlist to authenticated;

revoke execute on function public.get_admin_clients(text) from public, anon;
revoke execute on function public.get_admin_waitlist(text) from public, anon;
revoke execute on function public.get_loyalty_clients(text) from public, anon;
revoke execute on function public.update_appointment_action(text, uuid, boolean, text, boolean) from public, anon;
revoke execute on function public.update_waitlist_status(text, uuid, text) from public, anon;
revoke execute on function public.save_feature_flags(text, jsonb) from public, anon;
revoke execute on function public.get_barbershop_accesses(text) from public, anon;
revoke execute on function public.save_barbershop_accesses(text, jsonb) from public, anon;
revoke execute on function public.save_services(text, jsonb) from public, anon;
revoke execute on function public.save_professionals(text, jsonb) from public, anon;
revoke execute on function public.save_schedule_settings(text, integer, jsonb, jsonb, jsonb, jsonb) from public, anon;

-- Mantem anon aqui de proposito: clientes precisam consultar ocupacao sem dados pessoais.
grant execute on function public.get_admin_appointments(text) to anon, authenticated;

grant execute on function public.current_barbershop_role(text) to anon, authenticated;
grant execute on function public.can_manage_barbershop(text) to anon, authenticated;
grant execute on function public.can_manage_billing(text) to anon, authenticated;
grant execute on function public.can_manage_features(text) to anon, authenticated;

grant execute on function public.get_admin_clients(text) to authenticated;
grant execute on function public.get_admin_waitlist(text) to authenticated;
grant execute on function public.get_loyalty_clients(text) to authenticated;
grant execute on function public.update_appointment_action(text, uuid, boolean, text, boolean) to authenticated;
grant execute on function public.update_waitlist_status(text, uuid, text) to authenticated;
grant execute on function public.save_feature_flags(text, jsonb) to authenticated;
grant execute on function public.get_barbershop_accesses(text) to authenticated;
grant execute on function public.save_barbershop_accesses(text, jsonb) to authenticated;
grant execute on function public.save_services(text, jsonb) to authenticated;
grant execute on function public.save_professionals(text, jsonb) to authenticated;
grant execute on function public.save_schedule_settings(text, integer, jsonb, jsonb, jsonb, jsonb) to authenticated;

-- Diagnostico rapido depois de executar:
-- select public.current_barbershop_role('master');
-- select public.can_manage_barbershop('master');
-- select public.can_manage_billing('master');
-- select public.can_manage_features('master');
