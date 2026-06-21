-- Execute este arquivo no SQL Editor do Supabase.
-- Ele atualiza a base para o AgendaPro e cria/corrige o salvamento de acessos.

create schema if not exists private;

create or replace function private.safe_uuid(value text)
returns uuid
language plpgsql
as $$
begin
  return value::uuid;
exception
  when others then
    return null;
end;
$$;

alter table public.barbershop_admins
add column if not exists active boolean default true;

alter table public.barbershops
add column if not exists promotion_title text default 'Promoção online',
add column if not exists promotion_description text default 'Desconto especial para agendamentos feitos pelo app.',
add column if not exists promotion_discount numeric default 10;

insert into public.barbershops (
  name,
  slug,
  logo_text,
  whatsapp,
  address,
  maps_url,
  theme_color,
  theme_color_secondary,
  pix_enabled,
  pix_key,
  pix_discount,
  automatic_confirmation_enabled,
  success_title,
  success_message,
  success_footer,
  promotion_title,
  promotion_description,
  promotion_discount
) values (
  'AgendaPro',
  'agenda-pro',
  'A',
  '5551996238323',
  'Rua Exemplo, 123 - Centro',
  'https://maps.google.com/',
  '#22c55e',
  '#4ade80',
  true,
  '51996238323',
  10,
  true,
  'Agendamento confirmado!',
  'Seu horário já está reservado.',
  'A barbearia já recebeu os detalhes do atendimento.',
  'Promoção online',
  'Desconto especial para agendamentos feitos pelo app.',
  10
)
on conflict (slug) do update set
  name = excluded.name,
  logo_text = excluded.logo_text,
  whatsapp = excluded.whatsapp,
  address = excluded.address,
  maps_url = excluded.maps_url,
  theme_color = excluded.theme_color,
  theme_color_secondary = excluded.theme_color_secondary,
  pix_enabled = excluded.pix_enabled,
  pix_key = excluded.pix_key,
  pix_discount = excluded.pix_discount,
  automatic_confirmation_enabled = excluded.automatic_confirmation_enabled,
  success_title = excluded.success_title,
  success_message = excluded.success_message,
  success_footer = excluded.success_footer,
  promotion_title = excluded.promotion_title,
  promotion_description = excluded.promotion_description,
  promotion_discount = excluded.promotion_discount;

insert into public.barbershop_accounts (
  barbershop_id,
  owner_email,
  plan,
  monthly_status,
  next_billing_date
)
select
  id,
  'dyoser2@gmail.com',
  'professional',
  'active',
  current_date + interval '30 days'
from public.barbershops
where slug = 'agenda-pro'
on conflict do nothing;

update public.barbershop_accounts
set owner_email = 'dyoser2@gmail.com',
    plan = coalesce(plan, 'professional'),
    monthly_status = 'active'
where barbershop_id = (
  select id from public.barbershops where slug = 'agenda-pro'
);

delete from public.barbershop_admins
where email in ('dyoser@app.com', 'admin@barbeariadojoao.com')
  and barbershop_id = (
    select id from public.barbershops where slug = 'agenda-pro'
  );

insert into public.barbershop_admins (
  barbershop_id,
  email,
  role,
  active
)
select
  id,
  'dyoser2@gmail.com',
  'owner',
  true
from public.barbershops
where slug = 'agenda-pro'
on conflict (barbershop_id, email)
do update set
  role = 'owner',
  active = true;

insert into public.services (barbershop_id, name, duration, price, active, sort_order)
select id, 'Corte de cabelo', 30, 35, true, 1 from public.barbershops where slug = 'agenda-pro'
on conflict do nothing;

insert into public.services (barbershop_id, name, duration, price, active, sort_order)
select id, 'Barba', 20, 25, true, 2 from public.barbershops where slug = 'agenda-pro'
on conflict do nothing;

insert into public.services (barbershop_id, name, duration, price, active, sort_order)
select id, 'Sobrancelha', 10, 15, true, 3 from public.barbershops where slug = 'agenda-pro'
on conflict do nothing;

insert into public.services (barbershop_id, name, duration, price, active, sort_order)
select id, 'Descoloração', 90, 120, true, 4 from public.barbershops where slug = 'agenda-pro'
on conflict do nothing;

insert into public.services (barbershop_id, name, duration, price, active, sort_order)
select id, 'Coloração', 70, 100, true, 5 from public.barbershops where slug = 'agenda-pro'
on conflict do nothing;

insert into public.professionals (barbershop_id, name, active, fixed)
select id, 'Primeiro disponível', true, true
from public.barbershops
where slug = 'agenda-pro'
on conflict do nothing;

insert into public.working_hours (barbershop_id, week_day, enabled, start_time, end_time)
select id, day, day <> 0, '08:00', case when day = 6 then '16:00' else '18:00' end::time
from public.barbershops
cross join generate_series(0, 6) as day
where slug = 'agenda-pro'
on conflict (barbershop_id, week_day) do nothing;

insert into public.schedule_breaks (barbershop_id, name, start_time, end_time)
select id, 'Almoço', '12:00', '13:00'
from public.barbershops
where slug = 'agenda-pro'
on conflict do nothing;

insert into public.feature_flags (barbershop_id, feature_key, enabled, released)
select id, 'pix', true, true from public.barbershops where slug = 'agenda-pro'
on conflict (barbershop_id, feature_key)
do update set enabled = true, released = true;

insert into public.feature_flags (barbershop_id, feature_key, enabled, released)
select id, 'auto_confirmation', true, true from public.barbershops where slug = 'agenda-pro'
on conflict (barbershop_id, feature_key)
do update set enabled = true, released = true;

insert into public.feature_flags (barbershop_id, feature_key, enabled, released)
select id, 'promotions', false, false from public.barbershops where slug = 'agenda-pro'
on conflict (barbershop_id, feature_key) do nothing;

insert into public.feature_flags (barbershop_id, feature_key, enabled, released)
select id, 'waitlist', false, false from public.barbershops where slug = 'agenda-pro'
on conflict (barbershop_id, feature_key) do nothing;

insert into public.feature_flags (barbershop_id, feature_key, enabled, released)
select id, 'loyalty', false, false from public.barbershops where slug = 'agenda-pro'
on conflict (barbershop_id, feature_key) do nothing;

create or replace function public.get_barbershop_accesses(target_slug text)
returns table (
  id uuid,
  email text,
  role text,
  active boolean
)
language sql
security definer
set search_path = public
as $$
  select
    admin.id,
    admin.email,
    admin.role,
    coalesce(admin.active, true) as active
  from public.barbershop_admins admin
  join public.barbershops shop
    on shop.id = admin.barbershop_id
  where shop.slug = target_slug
  order by
    case admin.role
      when 'owner' then 1
      when 'platform' then 2
      else 3
    end,
    admin.email;
$$;

create or replace function public.save_barbershop_accesses(
  target_slug text,
  accesses_input jsonb
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
  clean_email text;
  clean_role text;
  clean_active boolean;
begin
  select id into target_id
  from public.barbershops
  where slug = target_slug
  limit 1;

  if target_id is null then
    raise exception 'AgendaPro não encontrado.';
  end if;

  update public.barbershop_admins
  set active = false
  where barbershop_id = target_id;

  for item in select * from jsonb_array_elements(accesses_input)
  loop
    clean_email := lower(trim(item->>'email'));
    clean_role := coalesce(nullif(item->>'role', ''), 'manager');
    clean_active := coalesce((item->>'active')::boolean, true);

    if clean_email is null or clean_email = '' then
      continue;
    end if;

    item_id := private.safe_uuid(item->>'id');

    if item_id is not null and exists (
      select 1
      from public.barbershop_admins
      where id = item_id
        and barbershop_id = target_id
    ) then
      update public.barbershop_admins
      set email = clean_email,
          role = clean_role,
          active = clean_active
      where id = item_id
        and barbershop_id = target_id;
    else
      insert into public.barbershop_admins (
        barbershop_id,
        email,
        role,
        active
      ) values (
        target_id,
        clean_email,
        clean_role,
        clean_active
      )
      on conflict (barbershop_id, email)
      do update set
        role = excluded.role,
        active = excluded.active;
    end if;
  end loop;
end;
$$;

grant execute on function public.get_barbershop_accesses(text) to anon, authenticated;
grant execute on function public.save_barbershop_accesses(text, jsonb) to anon, authenticated;

select *
from public.get_barbershop_accesses('agenda-pro');
