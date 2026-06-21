-- AgendaPro: repara a validacao publica de disponibilidade.
-- Corrige a RPC antiga que usava colunas legadas date/time/professional.
-- A tela publica tambem usa /api/public-slot-availability, mas manter esta
-- funcao correta evita falso "horario ocupado" quando a RPC for usada.

create or replace function public.check_public_slot_availability(
  target_slug text,
  target_date date,
  target_time text,
  target_professional text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_barbershop_id uuid;
  target_professional_id uuid;
  target_time_value time;
  clean_professional text;
  conflict_count integer := 0;
begin
  target_time_value := target_time::time;
  clean_professional := lower(trim(coalesce(target_professional, '')));

  select id
    into target_barbershop_id
  from public.barbershops
  where slug = target_slug
    and archived_at is null
  limit 1;

  if target_barbershop_id is null then
    return jsonb_build_object(
      'available', false,
      'reason', 'barbershop_not_found'
    );
  end if;

  if clean_professional <> ''
     and clean_professional not in (
       'primeiro disponivel',
       'primeiro disponível',
       'profissional disponivel',
       'profissional disponível'
     ) then
    select id
      into target_professional_id
    from public.professionals
    where barbershop_id = target_barbershop_id
      and lower(name) = clean_professional
      and active = true
    limit 1;

    if target_professional_id is null then
      return jsonb_build_object(
        'available', false,
        'reason', 'professional_not_found'
      );
    end if;
  end if;

  select count(*)
    into conflict_count
  from public.appointments appointment
  where appointment.barbershop_id = target_barbershop_id
    and appointment.appointment_date = target_date
    and appointment.appointment_time = target_time_value
    and coalesce(appointment.status, 'confirmed') not in ('cancelled', 'canceled', 'cancelado')
    and (
      target_professional_id is null
      or appointment.professional_id = target_professional_id
      or appointment.professional_id is null
    );

  return jsonb_build_object(
    'available', conflict_count = 0,
    'conflicts', conflict_count
  );
end;
$$;

grant execute on function public.check_public_slot_availability(text, date, text, text) to anon;
grant execute on function public.check_public_slot_availability(text, date, text, text) to authenticated;
