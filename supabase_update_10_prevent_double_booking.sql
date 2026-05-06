-- AgendaPro - trava definitiva contra agendamento duplicado
-- Execute este arquivo no SQL Editor do Supabase.
--
-- O que ele corrige:
-- 1. A segunda pessoa nao consegue confirmar o mesmo horario.
-- 2. Horarios que se cruzam pelo tempo do servico tambem sao bloqueados.
-- 3. Duas confirmacoes ao mesmo tempo passam por uma trava transacional.
-- 4. O agendamento so entra se a barbearia estiver aberta e fora de pausas/bloqueios.

create index if not exists appointments_shop_date_status_time_idx
on public.appointments (barbershop_id, appointment_date, status, appointment_time);

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
  clean_duration integer;
  appointment_end_time time;
  work_day public.working_hours%rowtype;
begin
  clean_whatsapp := regexp_replace(coalesce(whatsapp_input, ''), '\D', '', 'g');
  clean_duration := greatest(coalesce(duration_input, 30), 10);
  appointment_end_time := (appointment_time_input + make_interval(mins => clean_duration))::time;
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

  -- Trava por barbearia + dia.
  -- Assim duas reservas simultaneas para o mesmo dia nao passam juntas.
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

  -- Bloqueio forte por barbearia.
  -- Qualquer agendamento confirmado que cruze o periodo escolhido impede nova reserva.
  if exists (
    select 1
    from public.appointments appointment
    where appointment.barbershop_id = target_barbershop_id
      and appointment.appointment_date = appointment_date_input
      and coalesce(appointment.status, 'confirmed') not in ('cancelled', 'canceled', 'cancelado')
      and appointment_time_input < (appointment.appointment_time + make_interval(mins => appointment.duration))::time
      and appointment_end_time > appointment.appointment_time
  ) then
    raise exception 'Este horario acabou de ser ocupado. Escolha outro horario.';
  end if;

  if professional_name_input is not null
     and trim(professional_name_input) <> ''
     and professional_name_input <> 'Primeiro disponivel'
     and professional_name_input <> 'Primeiro disponível'
     and professional_name_input <> 'Profissional disponivel'
     and professional_name_input <> 'Profissional disponível' then

    select professional.id
      into target_professional_id
    from public.professionals professional
    where professional.barbershop_id = target_barbershop_id
      and professional.name = professional_name_input
      and professional.active = true
    limit 1;

    if target_professional_id is null then
      raise exception 'Profissional indisponivel.';
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
    order by professional.created_at
    limit 1;

    if target_professional_id is null then
      select professional.id
        into target_professional_id
      from public.professionals professional
      where professional.barbershop_id = target_barbershop_id
        and professional.active = true
      order by coalesce(professional.fixed, false), professional.created_at
      limit 1;
    end if;

    if target_professional_id is null then
      raise exception 'Nenhum profissional disponivel neste horario.';
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
    clean_duration,
    coalesce(total_input, 0),
    coalesce(nullif(payment_method_input, ''), 'local'),
    coalesce(paid_input, false),
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

-- Verificacao opcional depois de executar:
-- Rode este SELECT para encontrar horarios duplicados ja existentes.
-- Ele apenas lista, nao apaga nada.
select
  shop.slug,
  appointment.appointment_date,
  appointment.appointment_time,
  count(*) as quantidade
from public.appointments appointment
join public.barbershops shop
  on shop.id = appointment.barbershop_id
where coalesce(appointment.status, 'confirmed') not in ('cancelled', 'canceled', 'cancelado')
group by shop.slug, appointment.appointment_date, appointment.appointment_time
having count(*) > 1
order by appointment.appointment_date, appointment.appointment_time;
