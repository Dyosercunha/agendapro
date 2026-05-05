-- AgendaPro - correção fixa da agenda real (versão mais forte)
-- Execute no SQL Editor do Supabase usando Run, não Analyze/Explain.
-- Esta versão bloqueia o horário para a barbearia inteira.
-- Ou seja: no mesmo dia e horário, só entra um cliente.
-- Depois, se quiser permitir vários profissionais atendendo ao mesmo tempo,
-- a regra pode ser ajustada para bloquear por profissional.

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
  appointment_end_time time;
  work_day public.working_hours%rowtype;
begin
  clean_whatsapp := regexp_replace(whatsapp_input, '\D', '', 'g');
  appointment_end_time := (appointment_time_input + make_interval(mins => duration_input))::time;
  target_barbershop_id := private.barbershop_id_by_slug(target_slug);

  if target_barbershop_id is null then
    raise exception 'Agenda indisponível para este estabelecimento.';
  end if;

  -- Trava transacional: evita duas confirmações simultâneas passando juntas.
  perform pg_advisory_xact_lock(
    hashtext(target_barbershop_id::text || '|' || appointment_date_input::text || '|' || appointment_time_input::text)
  );

  select *
  into work_day
  from public.working_hours
  where barbershop_id = target_barbershop_id
    and week_day = extract(dow from appointment_date_input)::integer
  limit 1;

  if work_day.id is null or work_day.enabled = false then
    raise exception 'A barbearia está fechada nesta data.';
  end if;

  if appointment_time_input < work_day.start_time
     or appointment_end_time > work_day.end_time then
    raise exception 'Este horário está fora do funcionamento da barbearia.';
  end if;

  if exists (
    select 1
    from public.days_off
    where barbershop_id = target_barbershop_id
      and date = appointment_date_input
  ) then
    raise exception 'A barbearia está de folga nesta data.';
  end if;

  if exists (
    select 1
    from public.schedule_breaks
    where barbershop_id = target_barbershop_id
      and appointment_time_input < end_time
      and appointment_end_time > start_time
  ) then
    raise exception 'Este horário cai em uma pausa ou almoço.';
  end if;

  -- Bloqueio forte por barbearia: qualquer agendamento que cruze o mesmo horário bloqueia.
  if exists (
    select 1
    from public.appointments a
    where a.barbershop_id = target_barbershop_id
      and a.appointment_date = appointment_date_input
      and a.status not in ('cancelled', 'canceled', 'cancelado')
      and appointment_time_input < (a.appointment_time + make_interval(mins => a.duration))::time
      and appointment_end_time > a.appointment_time
  ) then
    raise exception 'Este horário acabou de ser ocupado. Escolha outro horário.';
  end if;

  if exists (
    select 1
    from public.schedule_blocks b
    where b.barbershop_id = target_barbershop_id
      and b.date = appointment_date_input
      and b.professional_id is null
      and appointment_time_input < b.end_time
      and appointment_end_time > b.start_time
  ) then
    raise exception 'Este horário está bloqueado.';
  end if;

  if professional_name_input is not null
     and professional_name_input <> ''
     and professional_name_input <> 'Primeiro disponível'
     and professional_name_input <> 'Profissional disponível' then

    select id
    into target_professional_id
    from public.professionals
    where barbershop_id = target_barbershop_id
      and name = professional_name_input
      and active = true
    limit 1;

    if target_professional_id is null then
      raise exception 'Profissional indisponível.';
    end if;

    if exists (
      select 1
      from public.schedule_blocks b
      where b.barbershop_id = target_barbershop_id
        and b.date = appointment_date_input
        and (b.professional_id is null or b.professional_id = target_professional_id)
        and appointment_time_input < b.end_time
        and appointment_end_time > b.start_time
    ) then
      raise exception 'Este horário está bloqueado para este profissional.';
    end if;

  else
    select p.id
    into target_professional_id
    from public.professionals p
    where p.barbershop_id = target_barbershop_id
      and p.active = true
      and coalesce(p.fixed, false) = false
      and not exists (
        select 1
        from public.schedule_blocks b
        where b.barbershop_id = target_barbershop_id
          and b.date = appointment_date_input
          and (b.professional_id is null or b.professional_id = p.id)
          and appointment_time_input < b.end_time
          and appointment_end_time > b.start_time
      )
    order by p.created_at
    limit 1;

    -- Fallback para projetos antigos que ainda só têm o registro fixo "Primeiro disponível".
    if target_professional_id is null then
      select p.id
      into target_professional_id
      from public.professionals p
      where p.barbershop_id = target_barbershop_id
        and p.active = true
      order by coalesce(p.fixed, false), p.created_at
      limit 1;
    end if;

    if target_professional_id is null then
      raise exception 'Nenhum profissional disponível neste horário.';
    end if;
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

grant execute on function public.book_appointment(
  text, text, text, text, text, date, time, integer, numeric, text, boolean
) to anon, authenticated;

-- Teste depois de executar:
-- 1. Agende um horário.
-- 2. Tente agendar outro cliente no mesmo horário ou em horário que cruze a duração.
-- 3. A segunda tentativa deve retornar:
-- Este horário acabou de ser ocupado. Escolha outro horário.
