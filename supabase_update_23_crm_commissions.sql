-- AgendaPro SQL 23
-- CRM interno, observacoes de agendamento e comissoes premium por profissional.

alter table public.professionals
  add column if not exists commission_percent numeric default 0,
  add column if not exists commission_by_service jsonb default '{}'::jsonb;

alter table public.appointments
  add column if not exists customer_note text;

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
    raise exception 'Barbearia nao encontrada.';
  end if;

  if not private.can_manage_barbershop_as(target_id, array['owner']) then
    raise exception 'Apenas o dono pode alterar profissionais desta barbearia.';
  end if;

  update public.professionals
  set active = false, updated_at = now()
  where barbershop_id = target_id;

  for item in select * from jsonb_array_elements(coalesce(professionals_input, '[]'::jsonb))
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
        commission_percent = greatest(0, least(100, coalesce((item->>'commission_percent')::numeric, 0))),
        commission_by_service = coalesce(item->'commission_by_service', '{}'::jsonb),
        updated_at = now()
      where id = item_id
        and barbershop_id = target_id;
    else
      insert into public.professionals (
        barbershop_id,
        name,
        active,
        fixed,
        commission_percent,
        commission_by_service
      ) values (
        target_id,
        item->>'name',
        coalesce((item->>'active')::boolean, true),
        coalesce((item->>'fixed')::boolean, false),
        greatest(0, least(100, coalesce((item->>'commission_percent')::numeric, 0))),
        coalesce(item->'commission_by_service', '{}'::jsonb)
      );
    end if;
  end loop;
end;
$$;

create or replace function public.update_appointment_action(
  target_slug text,
  appointment_id_input uuid,
  paid_input boolean,
  status_input text,
  reschedule_requested_input boolean,
  note_input text,
  payment_method_input text
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
    customer_note = case
      when note_input is null then customer_note
      else nullif(note_input, '')
    end,
    payment_method = case
      when payment_method_input in ('cash', 'pix', 'card', 'local') then payment_method_input
      when payment_method_input is null then payment_method
      else payment_method
    end,
    cancelled_at = case
      when status_input = 'cancelled' and cancelled_at is null then now()
      else cancelled_at
    end,
    updated_at = now()
  where id = appointment_id_input
    and barbershop_id = target_id;
end;
$$;

grant execute on function public.save_professionals(text, jsonb) to authenticated;
grant execute on function public.update_appointment_action(text, uuid, boolean, text, boolean, text, text) to authenticated;

-- Teste rapido depois de executar:
-- select column_name from information_schema.columns where table_name = 'professionals' and column_name like 'commission%';
