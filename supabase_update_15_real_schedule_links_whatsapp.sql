-- AgendaPro SQL 15
-- Segurança de acesso + agendamento real + link unico do cliente.
--
-- Execute este arquivo no SQL Editor do Supabase depois do SQL 14.
-- Ele é idempotente: pode rodar novamente se precisar.

create extension if not exists pgcrypto;
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

alter table public.appointments
  add column if not exists public_token text,
  add column if not exists customer_note text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists reschedule_requested_at timestamptz;

update public.appointments
set public_token = gen_random_uuid()::text
where public_token is null or trim(public_token) = '';

alter table public.appointments
  alter column public_token set default gen_random_uuid()::text;

create unique index if not exists appointments_public_token_unique
on public.appointments (public_token);

create index if not exists appointments_shop_professional_date_status_idx
on public.appointments (barbershop_id, professional_id, appointment_date, status, appointment_time);

create or replace function public.book_appointment_v2(
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
  paid_input boolean,
  note_input text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_barbershop_id uuid;
  target_client_id uuid;
  target_professional_id uuid;
  new_appointment_id uuid;
  new_public_token text;
  clean_whatsapp text;
  clean_duration integer;
  appointment_end_time time;
  work_day public.working_hours%rowtype;
  requested_professional text;
begin
  clean_whatsapp := regexp_replace(coalesce(whatsapp_input, ''), '\D', '', 'g');
  clean_duration := greatest(coalesce(duration_input, 30), 10);
  appointment_end_time := (appointment_time_input + make_interval(mins => clean_duration))::time;
  requested_professional := trim(coalesce(professional_name_input, ''));
  target_barbershop_id := private.barbershop_id_by_slug(target_slug);

  if target_barbershop_id is null then
    raise exception 'Agenda indisponivel para este estabelecimento.';
  end if;

  if exists (
    select 1
    from public.barbershop_accounts account
    where account.barbershop_id = target_barbershop_id
      and account.monthly_status = 'blocked'
  ) then
    raise exception 'Agenda temporariamente indisponivel para este estabelecimento.';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(target_barbershop_id::text),
    hashtext(appointment_date_input::text)
  );

  select *
    into work_day
  from public.working_hours
  where barbershop_id = target_barbershop_id
    and week_day = extract(dow from appointment_date_input)::integer
  limit 1;

  if work_day.id is null or work_day.enabled = false then
    raise exception 'A barbearia esta fechada nesta data.';
  end if;

  if appointment_time_input < work_day.start_time
     or appointment_end_time > work_day.end_time then
    raise exception 'Este horario esta fora do funcionamento da barbearia.';
  end if;

  if exists (
    select 1
    from public.days_off day_off
    where day_off.barbershop_id = target_barbershop_id
      and day_off.date = appointment_date_input
  ) then
    raise exception 'A barbearia esta de folga nesta data.';
  end if;

  if exists (
    select 1
    from public.schedule_breaks pause
    where pause.barbershop_id = target_barbershop_id
      and appointment_time_input < pause.end_time
      and appointment_end_time > pause.start_time
  ) then
    raise exception 'Este horario cai em uma pausa ou almoco.';
  end if;

  if requested_professional <> ''
     and lower(requested_professional) not in (
       'primeiro disponivel',
       'primeiro disponível',
       'profissional disponivel',
       'profissional disponível'
     ) then
    select professional.id
      into target_professional_id
    from public.professionals professional
    where professional.barbershop_id = target_barbershop_id
      and lower(professional.name) = lower(requested_professional)
      and professional.active = true
    limit 1;

    if target_professional_id is null then
      raise exception 'Profissional indisponivel.';
    end if;
  else
    select professional.id
      into target_professional_id
    from public.professionals professional
    where professional.barbershop_id = target_barbershop_id
      and professional.active = true
      and coalesce(professional.fixed, false) = false
      and not exists (
        select 1
        from public.schedule_blocks schedule_block
        where schedule_block.barbershop_id = target_barbershop_id
          and schedule_block.date = appointment_date_input
          and (
            schedule_block.professional_id is null
            or schedule_block.professional_id = professional.id
          )
          and appointment_time_input < schedule_block.end_time
          and appointment_end_time > schedule_block.start_time
      )
      and not exists (
        select 1
        from public.appointments appointment
        where appointment.barbershop_id = target_barbershop_id
          and appointment.appointment_date = appointment_date_input
          and coalesce(appointment.status, 'confirmed') not in ('cancelled', 'canceled', 'cancelado')
          and (
            appointment.professional_id = professional.id
            or appointment.professional_id is null
          )
          and appointment_time_input < (appointment.appointment_time + make_interval(mins => appointment.duration))::time
          and appointment_end_time > appointment.appointment_time
      )
    order by professional.created_at
    limit 1;

    if target_professional_id is null then
      select professional.id
        into target_professional_id
      from public.professionals professional
      where professional.barbershop_id = target_barbershop_id
        and professional.active = true
        and not exists (
          select 1
          from public.appointments appointment
          where appointment.barbershop_id = target_barbershop_id
            and appointment.appointment_date = appointment_date_input
            and coalesce(appointment.status, 'confirmed') not in ('cancelled', 'canceled', 'cancelado')
            and (
              appointment.professional_id = professional.id
              or appointment.professional_id is null
            )
            and appointment_time_input < (appointment.appointment_time + make_interval(mins => appointment.duration))::time
            and appointment_end_time > appointment.appointment_time
        )
      order by coalesce(professional.fixed, false), professional.created_at
      limit 1;
    end if;

    if target_professional_id is null then
      raise exception 'Nenhum profissional disponivel neste horario.';
    end if;
  end if;

  if exists (
    select 1
    from public.schedule_blocks schedule_block
    where schedule_block.barbershop_id = target_barbershop_id
      and schedule_block.date = appointment_date_input
      and (
        schedule_block.professional_id is null
        or schedule_block.professional_id = target_professional_id
      )
      and appointment_time_input < schedule_block.end_time
      and appointment_end_time > schedule_block.start_time
  ) then
    raise exception 'Este horario esta bloqueado para este profissional.';
  end if;

  if exists (
    select 1
    from public.appointments appointment
    where appointment.barbershop_id = target_barbershop_id
      and appointment.appointment_date = appointment_date_input
      and coalesce(appointment.status, 'confirmed') not in ('cancelled', 'canceled', 'cancelado')
      and (
        appointment.professional_id = target_professional_id
        or appointment.professional_id is null
        or target_professional_id is null
      )
      and appointment_time_input < (appointment.appointment_time + make_interval(mins => appointment.duration))::time
      and appointment_end_time > appointment.appointment_time
  ) then
    raise exception 'Este horario acabou de ser ocupado. Escolha outro horario.';
  end if;

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
    reschedule_requested,
    customer_note
  ) values (
    target_barbershop_id,
    target_client_id,
    target_professional_id,
    client_name_input,
    clean_whatsapp,
    service_text_input,
    appointment_date_input,
    appointment_time_input,
    clean_duration,
    coalesce(total_input, 0),
    coalesce(nullif(payment_method_input, ''), 'local'),
    coalesce(paid_input, false),
    'confirmed',
    false,
    nullif(note_input, '')
  )
  returning id, public_token into new_appointment_id, new_public_token;

  return jsonb_build_object(
    'id', new_appointment_id,
    'public_token', new_public_token
  );
end;
$$;

create or replace function public.get_public_appointment(
  target_slug text,
  public_token_input text
)
returns table (
  public_token text,
  client_name text,
  whatsapp text,
  service_text text,
  professional_name text,
  appointment_date date,
  appointment_time time,
  duration integer,
  total numeric,
  payment_method text,
  paid boolean,
  status text,
  reschedule_requested boolean,
  customer_note text
)
language sql
security definer
set search_path = public
as $$
  select
    appointment.public_token,
    appointment.client_name,
    appointment.whatsapp,
    appointment.service_text,
    coalesce(professional.name, 'Profissional disponivel') as professional_name,
    appointment.appointment_date,
    appointment.appointment_time,
    appointment.duration,
    appointment.total,
    appointment.payment_method,
    appointment.paid,
    appointment.status,
    appointment.reschedule_requested,
    appointment.customer_note
  from public.appointments appointment
  join public.barbershops shop on shop.id = appointment.barbershop_id
  left join public.professionals professional on professional.id = appointment.professional_id
  where shop.slug = target_slug
    and shop.archived_at is null
    and appointment.public_token = public_token_input
  limit 1;
$$;

create or replace function public.request_appointment_reschedule(
  target_slug text,
  public_token_input text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_count integer;
begin
  update public.appointments appointment
  set reschedule_requested = true,
      reschedule_requested_at = now(),
      updated_at = now()
  from public.barbershops shop
  where shop.id = appointment.barbershop_id
    and shop.slug = target_slug
    and shop.archived_at is null
    and appointment.public_token = public_token_input
    and coalesce(appointment.status, 'confirmed') not in ('cancelled', 'canceled', 'cancelado');

  get diagnostics changed_count = row_count;
  return changed_count > 0;
end;
$$;

create or replace function public.cancel_appointment_public(
  target_slug text,
  public_token_input text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_count integer;
begin
  update public.appointments appointment
  set status = 'cancelled',
      cancelled_at = now(),
      updated_at = now()
  from public.barbershops shop
  where shop.id = appointment.barbershop_id
    and shop.slug = target_slug
    and shop.archived_at is null
    and appointment.public_token = public_token_input
    and coalesce(appointment.status, 'confirmed') not in ('cancelled', 'canceled', 'cancelado');

  get diagnostics changed_count = row_count;
  return changed_count > 0;
end;
$$;

grant execute on function public.book_appointment_v2(
  text, text, text, text, text, date, time, integer, numeric, text, boolean, text
) to anon, authenticated;
grant execute on function public.get_public_appointment(text, text) to anon, authenticated;
grant execute on function public.request_appointment_reschedule(text, text) to anon, authenticated;
grant execute on function public.cancel_appointment_public(text, text) to anon, authenticated;

-- Verificacoes depois de executar:
-- 1) O desenvolvedor deve aparecer como platform em todas as barbearias.
select shop.slug, admin.email, admin.role, admin.active
from public.barbershops shop
left join public.barbershop_admins admin
  on admin.barbershop_id = shop.id
 and lower(admin.email) = 'dyoser2@gmail.com'
order by shop.slug;

-- 2) Possiveis conflitos ainda existentes por profissional.
select
  shop.slug,
  appointment.appointment_date,
  appointment.appointment_time,
  appointment.professional_id,
  count(*) as quantidade
from public.appointments appointment
join public.barbershops shop on shop.id = appointment.barbershop_id
where coalesce(appointment.status, 'confirmed') not in ('cancelled', 'canceled', 'cancelado')
group by shop.slug, appointment.appointment_date, appointment.appointment_time, appointment.professional_id
having count(*) > 1
order by appointment.appointment_date, appointment.appointment_time;
