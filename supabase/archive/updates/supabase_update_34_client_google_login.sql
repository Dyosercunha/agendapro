-- AgendaPro - Login Google do cliente
-- Objetivo:
-- 1. Permitir que o cliente logado com Google recupere nome/WhatsApp/historico.
-- 2. Vincular novos agendamentos ao e-mail Google sem expor dados de outros clientes.

alter table public.clients
  add column if not exists email text;

alter table public.appointments
  add column if not exists client_email text;

create index if not exists clients_shop_email_idx
on public.clients (barbershop_id, lower(email))
where email is not null and length(trim(email)) > 0;

create index if not exists appointments_shop_client_email_idx
on public.appointments (barbershop_id, lower(client_email))
where client_email is not null and length(trim(client_email)) > 0;

create or replace function public.get_client_profile_by_email(
  target_slug text,
  client_email_input text
)
returns table (
  client_name text,
  whatsapp text,
  last_service_text text,
  visit_count integer,
  last_professional text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  clean_email text := lower(trim(coalesce(client_email_input, '')));
  target_barbershop_id uuid;
begin
  if (select auth.uid()) is null then
    return;
  end if;

  if clean_email = '' or auth_email = '' or auth_email <> clean_email then
    return;
  end if;

  select shop.id
    into target_barbershop_id
  from public.barbershops shop
  left join public.barbershop_accounts account
    on account.barbershop_id = shop.id
  where shop.slug = target_slug
    and shop.archived_at is null
    and coalesce(account.monthly_status, 'active') <> 'blocked'
  limit 1;

  if target_barbershop_id is null then
    return;
  end if;

  return query
  with client_profile as (
    select client.*
    from public.clients client
    where client.barbershop_id = target_barbershop_id
      and lower(trim(coalesce(client.email, ''))) = clean_email
    order by client.last_seen_at desc nulls last, client.updated_at desc nulls last
    limit 1
  ),
  latest_appointment as (
    select appointment.*, professional.name as professional_name
    from public.appointments appointment
    left join public.professionals professional
      on professional.id = appointment.professional_id
    where appointment.barbershop_id = target_barbershop_id
      and coalesce(appointment.status, 'confirmed') not in ('cancelled', 'canceled', 'cancelado')
      and (
        lower(trim(coalesce(appointment.client_email, ''))) = clean_email
        or appointment.client_id in (select client_profile.id from client_profile)
        or appointment.whatsapp in (select client_profile.whatsapp from client_profile)
      )
    order by appointment.appointment_date desc, appointment.appointment_time desc
    limit 1
  ),
  visit_counter as (
    select count(*)::integer as visits
    from public.appointments appointment
    where appointment.barbershop_id = target_barbershop_id
      and coalesce(appointment.status, 'confirmed') not in ('cancelled', 'canceled', 'cancelado')
      and (
        lower(trim(coalesce(appointment.client_email, ''))) = clean_email
        or appointment.client_id in (select client_profile.id from client_profile)
        or appointment.whatsapp in (select client_profile.whatsapp from client_profile)
      )
  )
  select
    coalesce(
      nullif((select client_profile.name from client_profile), ''),
      nullif((select latest_appointment.client_name from latest_appointment), ''),
      ''
    )::text as client_name,
    coalesce(
      nullif((select client_profile.whatsapp from client_profile), ''),
      nullif((select latest_appointment.whatsapp from latest_appointment), ''),
      ''
    )::text as whatsapp,
    coalesce(
      nullif((select client_profile.last_service_text from client_profile), ''),
      nullif((select latest_appointment.service_text from latest_appointment), ''),
      ''
    )::text as last_service_text,
    greatest(
      coalesce((select client_profile.visit_count from client_profile), 0),
      coalesce((select visit_counter.visits from visit_counter), 0)
    )::integer as visit_count,
    coalesce(
      nullif((select latest_appointment.professional_name from latest_appointment), ''),
      'Primeiro disponivel'
    )::text as last_professional;
end;
$$;

revoke all on function public.get_client_profile_by_email(text, text) from public;
grant execute on function public.get_client_profile_by_email(text, text) to authenticated;

create or replace function public.link_client_google_profile(
  target_slug text,
  public_token_input text,
  client_email_input text,
  client_name_input text default '',
  whatsapp_input text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  clean_email text := lower(trim(coalesce(client_email_input, '')));
  clean_whatsapp text := regexp_replace(coalesce(whatsapp_input, ''), '\D', '', 'g');
  linked_client_id uuid;
  target_appointment record;
  target_barbershop_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Login Google necessario.' using errcode = '42501';
  end if;

  if clean_email = '' or auth_email = '' or auth_email <> clean_email then
    raise exception 'E-mail do Google nao confere.' using errcode = '42501';
  end if;

  select shop.id
    into target_barbershop_id
  from public.barbershops shop
  where shop.slug = target_slug
    and shop.archived_at is null
  limit 1;

  if target_barbershop_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  select appointment.*
    into target_appointment
  from public.appointments appointment
  where appointment.barbershop_id = target_barbershop_id
    and appointment.public_token = public_token_input
  limit 1;

  if not found then
    raise exception 'Agendamento nao encontrado.';
  end if;

  clean_whatsapp := coalesce(nullif(clean_whatsapp, ''), regexp_replace(coalesce(target_appointment.whatsapp, ''), '\D', '', 'g'));

  update public.appointments
     set client_email = clean_email,
         updated_at = now()
   where id = target_appointment.id;

  if target_appointment.client_id is not null then
    update public.clients
       set email = clean_email,
           name = coalesce(nullif(client_name_input, ''), name),
           whatsapp = coalesce(nullif(clean_whatsapp, ''), whatsapp),
           updated_at = now()
     where id = target_appointment.client_id
     returning id into linked_client_id;
  end if;

  if linked_client_id is null and clean_whatsapp <> '' then
    insert into public.clients (
      barbershop_id,
      name,
      whatsapp,
      email,
      visit_count,
      last_service_text,
      last_seen_at
    ) values (
      target_barbershop_id,
      coalesce(nullif(client_name_input, ''), target_appointment.client_name),
      clean_whatsapp,
      clean_email,
      1,
      target_appointment.service_text,
      now()
    )
    on conflict (barbershop_id, whatsapp)
    do update set
      email = excluded.email,
      name = coalesce(nullif(excluded.name, ''), public.clients.name),
      last_service_text = coalesce(nullif(excluded.last_service_text, ''), public.clients.last_service_text),
      last_seen_at = now(),
      updated_at = now()
    returning id into linked_client_id;

    update public.appointments
       set client_id = linked_client_id,
           updated_at = now()
     where id = target_appointment.id
       and client_id is null;
  end if;

  return jsonb_build_object(
    'ok', true,
    'client_id', linked_client_id,
    'client_email', clean_email
  );
end;
$$;

revoke all on function public.link_client_google_profile(text, text, text, text, text) from public;
grant execute on function public.link_client_google_profile(text, text, text, text, text) to authenticated;
