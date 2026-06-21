-- AgendaPro SQL 33
-- Reparo do salvamento da forma de pagamento na Agenda Hoje.
--
-- Objetivo:
-- - permitir que acessos autorizados da agenda (desenvolvedor, dono e funcionario)
--   marquem um atendimento como recebido e definam dinheiro/PIX/cartao;
-- - manter a regra de acesso limitada a usuarios vinculados a propria barbearia;
-- - nao liberar controle de mensalidade, plano ou melhorias para funcionario.

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
    paid = coalesce(paid_input, paid),
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

  if not found then
    raise exception 'Agendamento nao encontrado para esta barbearia.';
  end if;
end;
$$;

revoke execute on function public.update_appointment_action(text, uuid, boolean, text, boolean, text, text)
from public, anon;

grant execute on function public.update_appointment_action(text, uuid, boolean, text, boolean, text, text)
to authenticated;

-- Diagnostico rapido depois de executar:
select
  to_regprocedure('public.update_appointment_action(text,uuid,boolean,text,boolean,text,text)') is not null
    as update_appointment_action_existe,
  has_function_privilege(
    'authenticated',
    'public.update_appointment_action(text,uuid,boolean,text,boolean,text,text)',
    'EXECUTE'
  ) as update_appointment_action_authenticated,
  has_function_privilege(
    'anon',
    'public.update_appointment_action(text,uuid,boolean,text,boolean,text,text)',
    'EXECUTE'
  ) as update_appointment_action_anon;
