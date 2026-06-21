-- AgendaPro SQL 26
-- Base oficial para WhatsApp Cloud API: logs de mensagens, status via webhook e flags no agendamento.

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete set null,
  barbershop_id uuid references public.barbershops(id) on delete cascade,
  customer_id uuid references public.clients(id) on delete set null,
  to_phone text not null,
  template_name text,
  message_type text,
  whatsapp_message_id text,
  status text default 'queued',
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists whatsapp_messages_appointment_idx
on public.whatsapp_messages (appointment_id);

create index if not exists whatsapp_messages_barbershop_idx
on public.whatsapp_messages (barbershop_id);

create index if not exists whatsapp_messages_message_id_idx
on public.whatsapp_messages (whatsapp_message_id);

alter table public.appointments
  add column if not exists cancel_token text,
  add column if not exists reschedule_token text,
  add column if not exists whatsapp_customer_sent boolean default false,
  add column if not exists whatsapp_shop_sent boolean default false,
  add column if not exists whatsapp_reminder_24h_sent boolean default false;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'appointments'
      and column_name = 'public_token'
  ) then
    execute '
      update public.appointments
      set
        cancel_token = coalesce(cancel_token, public_token),
        reschedule_token = coalesce(reschedule_token, public_token)
      where public_token is not null
    ';
  end if;
end;
$$;

alter table public.whatsapp_messages enable row level security;

drop policy if exists "Platform can read whatsapp logs" on public.whatsapp_messages;
create policy "Platform can read whatsapp logs"
on public.whatsapp_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.platform_admins admin
    where lower(admin.email) = lower(auth.jwt() ->> 'email')
      and coalesce(admin.active, true) = true
  )
);
