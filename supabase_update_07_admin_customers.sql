-- Execute este arquivo no SQL Editor do Supabase.
-- Ele libera a leitura segura dos agendamentos e clientes do painel por slug.

create schema if not exists private;

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

grant execute on function public.get_admin_appointments(text) to anon, authenticated;
grant execute on function public.get_admin_clients(text) to anon, authenticated;

select
  'appointments' as source,
  count(*) as total
from public.get_admin_appointments('barbearia-do-joao')
union all
select
  'clients' as source,
  count(*) as total
from public.get_admin_clients('barbearia-do-joao');
