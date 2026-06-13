-- AgendaPro: RPC pública segura para validação de disponibilidade de horário.
-- Objetivo: permitir que a tela pública /agendamento/{slug} valide conflito
-- sem chamar a função administrativa get_admin_appointments.

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
  conflict_count integer := 0;
begin
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

  select count(*)
  into conflict_count
  from public.appointments
  where barbershop_id = target_barbershop_id
    and date = target_date
    and time = target_time
    and coalesce(status, 'confirmed') not in ('cancelled', 'canceled')
    and (
      target_professional is null
      or target_professional = ''
      or professional = target_professional
      or target_professional = 'Primeiro disponível'
    );

  return jsonb_build_object(
    'available', conflict_count = 0,
    'conflicts', conflict_count
  );
end;
$$;

grant execute on function public.check_public_slot_availability(text, date, text, text) to anon;
grant execute on function public.check_public_slot_availability(text, date, text, text) to authenticated;
