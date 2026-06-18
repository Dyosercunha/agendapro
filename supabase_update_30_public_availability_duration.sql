-- AgendaPro: disponibilidade publica com duracao real e sem bloqueio global indevido.
-- Execute no Supabase SQL Editor.
-- Corrige:
-- 1. Horarios quebrados por duracao real do servico, ex.: 10:00-10:40 libera 10:40.
-- 2. Agendamentos antigos sem professional_id nao bloqueiam todos os profissionais
--    quando a barbearia tem mais de um profissional ativo.
-- 3. Retorna apenas disponivel/ocupado, sem dados sensiveis de outros clientes.

drop function if exists public.check_public_slot_availability(text, date, text, text);
drop function if exists public.check_public_slot_availability(text, date, text, text, integer);

create or replace function public.check_public_slot_availability(
  target_slug text,
  target_date date,
  target_time text,
  target_professional text default null,
  target_duration integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_barbershop_id uuid;
  requested_start time;
  requested_end time;
  clean_duration integer;
  clean_professional text;
  selected_professional_id uuid;
  selected_professional_name text;
  active_professional_count integer := 0;
  candidate record;
  week_day_value integer;
  work_start time;
  work_end time;
  work_enabled boolean;
begin
  requested_start := target_time::time;
  clean_duration := greatest(coalesce(target_duration, 30), 10);
  requested_end := requested_start + make_interval(mins => clean_duration);
  clean_professional := lower(trim(coalesce(target_professional, '')));
  week_day_value := extract(dow from target_date)::integer;

  select shop.id
    into target_barbershop_id
  from public.barbershops shop
  where shop.slug = target_slug
    and shop.archived_at is null
  limit 1;

  if target_barbershop_id is null then
    return jsonb_build_object('available', false, 'reason', 'barbershop_not_found');
  end if;

  select hours.start_time::time, hours.end_time::time, coalesce(hours.enabled, true)
    into work_start, work_end, work_enabled
  from public.working_hours hours
  where hours.barbershop_id = target_barbershop_id
    and hours.week_day = week_day_value
  limit 1;

  if work_start is null or work_enabled is false then
    return jsonb_build_object('available', false, 'reason', 'closed');
  end if;

  if requested_start < work_start or requested_end > work_end then
    return jsonb_build_object('available', false, 'reason', 'outside_working_hours');
  end if;

  if exists (
    select 1
    from public.days_off day_off
    where day_off.barbershop_id = target_barbershop_id
      and day_off.date = target_date
  ) then
    return jsonb_build_object('available', false, 'reason', 'day_off');
  end if;

  if exists (
    select 1
    from public.schedule_breaks pause
    where pause.barbershop_id = target_barbershop_id
      and pause.start_time::time < requested_end
      and pause.end_time::time > requested_start
  ) then
    return jsonb_build_object('available', false, 'reason', 'break');
  end if;

  select count(*)
    into active_professional_count
  from public.professionals professional
  where professional.barbershop_id = target_barbershop_id
    and coalesce(professional.active, true) = true
    and coalesce(professional.fixed, false) = false;

  if active_professional_count = 0 then
    return jsonb_build_object('available', false, 'reason', 'professional_not_found');
  end if;

  if clean_professional <> ''
     and clean_professional not in (
       'primeiro disponivel',
       'primeiro disponível',
       'profissional disponivel',
       'profissional disponível'
     ) then
    select professional.id, professional.name
      into selected_professional_id, selected_professional_name
    from public.professionals professional
    where professional.barbershop_id = target_barbershop_id
      and lower(trim(professional.name)) = clean_professional
      and coalesce(professional.active, true) = true
      and coalesce(professional.fixed, false) = false
    limit 1;

    if selected_professional_id is null then
      return jsonb_build_object('available', false, 'reason', 'professional_not_found');
    end if;

    if exists (
      select 1
      from public.schedule_blocks block
      where block.barbershop_id = target_barbershop_id
        and block.date = target_date
        and block.start_time::time < requested_end
        and block.end_time::time > requested_start
        and (block.professional_id is null or block.professional_id = selected_professional_id)
    ) then
      return jsonb_build_object('available', false, 'reason', 'blocked');
    end if;

    if exists (
      select 1
      from public.appointments appointment
      where appointment.barbershop_id = target_barbershop_id
        and appointment.appointment_date = target_date
        and coalesce(appointment.status, 'confirmed') not in ('cancelled', 'canceled', 'cancelado')
        and appointment.appointment_time::time < requested_end
        and (
          appointment.appointment_time::time
          + make_interval(mins => greatest(coalesce(appointment.duration, 30), 10))
        ) > requested_start
        and (
          appointment.professional_id = selected_professional_id
          or (appointment.professional_id is null and active_professional_count <= 1)
        )
    ) then
      return jsonb_build_object('available', false, 'reason', 'busy');
    end if;

    return jsonb_build_object(
      'available', true,
      'reason', '',
      'professionalId', selected_professional_id,
      'professionalName', selected_professional_name
    );
  end if;

  for candidate in
    select professional.id, professional.name
    from public.professionals professional
    where professional.barbershop_id = target_barbershop_id
      and coalesce(professional.active, true) = true
      and coalesce(professional.fixed, false) = false
    order by professional.created_at asc nulls last, professional.name asc
  loop
    if not exists (
      select 1
      from public.schedule_blocks block
      where block.barbershop_id = target_barbershop_id
        and block.date = target_date
        and block.start_time::time < requested_end
        and block.end_time::time > requested_start
        and (block.professional_id is null or block.professional_id = candidate.id)
    )
    and not exists (
      select 1
      from public.appointments appointment
      where appointment.barbershop_id = target_barbershop_id
        and appointment.appointment_date = target_date
        and coalesce(appointment.status, 'confirmed') not in ('cancelled', 'canceled', 'cancelado')
        and appointment.appointment_time::time < requested_end
        and (
          appointment.appointment_time::time
          + make_interval(mins => greatest(coalesce(appointment.duration, 30), 10))
        ) > requested_start
        and (
          appointment.professional_id = candidate.id
          or (appointment.professional_id is null and active_professional_count <= 1)
        )
    ) then
      return jsonb_build_object(
        'available', true,
        'reason', '',
        'professionalId', candidate.id,
        'professionalName', candidate.name
      );
    end if;
  end loop;

  return jsonb_build_object('available', false, 'reason', 'busy');
end;
$$;

revoke all on function public.check_public_slot_availability(text, date, text, text, integer) from public;
grant execute on function public.check_public_slot_availability(text, date, text, text, integer) to anon;
grant execute on function public.check_public_slot_availability(text, date, text, text, integer) to authenticated;

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
  active_professional_count integer := 0;
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

  select count(*)
    into active_professional_count
  from public.professionals professional
  where professional.barbershop_id = target_barbershop_id
    and professional.active = true
    and coalesce(professional.fixed, false) = false;

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
      and lower(trim(professional.name)) = lower(trim(requested_professional))
      and professional.active = true
      and coalesce(professional.fixed, false) = false
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
            or (appointment.professional_id is null and active_professional_count <= 1)
          )
          and appointment_time_input < (
            appointment.appointment_time
            + make_interval(mins => greatest(coalesce(appointment.duration, 30), 10))
          )::time
          and appointment_end_time > appointment.appointment_time
      )
    order by professional.created_at
    limit 1;

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
        or (appointment.professional_id is null and active_professional_count <= 1)
      )
      and appointment_time_input < (
        appointment.appointment_time
        + make_interval(mins => greatest(coalesce(appointment.duration, 30), 10))
      )::time
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

grant execute on function public.book_appointment_v2(
  text, text, text, text, text, date, time, integer, numeric, text, boolean, text
) to anon, authenticated;
