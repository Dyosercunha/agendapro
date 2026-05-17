-- AgendaPro SQL 13
-- Landing/comercial: limpeza definitiva segura, permissoes por cargo e ajustes de melhorias.
-- Execute depois do SQL 12.

create or replace function private.normalized_barbershop_role(value text)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(value, '')) in ('owner', 'dono') then 'owner'
    when lower(coalesce(value, '')) in ('developer', 'desenvolvedor', 'platform', 'plataforma') then 'owner'
    else 'employee'
  end;
$$;

create or replace function private.can_manage_barbershop_as(
  target_barbershop_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    private.is_platform_admin_email(private.current_auth_email())
    or exists (
      select 1
      from public.barbershop_admins admin
      where admin.barbershop_id = target_barbershop_id
        and lower(admin.email) = private.current_auth_email()
        and coalesce(admin.active, true) = true
        and private.normalized_barbershop_role(admin.role) = any(allowed_roles)
    );
$$;

create or replace function public.get_platform_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not private.is_platform_admin_email(private.current_auth_email()) then
    raise exception 'Acesso restrito ao administrador da plataforma.';
  end if;

  select jsonb_build_object(
    'stats', jsonb_build_object(
      'total', count(*) filter (where shop.archived_at is null),
      'archived', count(*) filter (where shop.archived_at is not null),
      'active', count(*) filter (where account.monthly_status = 'active' and shop.archived_at is null),
      'trial', count(*) filter (where account.monthly_status = 'trial' and shop.archived_at is null),
      'overdue', count(*) filter (where account.monthly_status = 'overdue' and shop.archived_at is null),
      'blocked', count(*) filter (where account.monthly_status = 'blocked' and shop.archived_at is null),
      'monthly_revenue', coalesce(sum(account.plan_price) filter (where account.monthly_status in ('active', 'trial') and shop.archived_at is null), 0),
      'overdue_revenue', coalesce(sum(account.plan_price) filter (where account.monthly_status = 'overdue' and shop.archived_at is null), 0),
      'next_billing', min(account.next_billing_date) filter (where shop.archived_at is null)
    ),
    'barbershops', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', shop.id,
        'name', shop.name,
        'slug', shop.slug,
        'whatsapp', shop.whatsapp,
        'address', shop.address,
        'owner_email', account.owner_email,
        'plan', account.plan,
        'plan_label', case account.plan when 'starter' then 'Inicial' when 'premium' then 'Premium' else 'Profissional' end,
        'plan_price', coalesce(account.plan_price, 0),
        'monthly_status', account.monthly_status,
        'status_label', case account.monthly_status when 'trial' then 'Teste de 30 dias' when 'overdue' then 'Pagamento atrasado' when 'blocked' then 'Desativado' else 'Ativo' end,
        'next_billing_date', account.next_billing_date,
        'days_to_billing', account.next_billing_date - current_date,
        'pix_key', shop.pix_key,
        'theme_color', shop.theme_color,
        'features', coalesce((
          select jsonb_object_agg(flag.feature_key, jsonb_build_object('enabled', flag.enabled, 'released', flag.released))
          from public.feature_flags flag
          where flag.barbershop_id = shop.id
        ), '{}'::jsonb)
      )
      order by shop.created_at desc
    ) filter (where shop.archived_at is null), '[]'::jsonb)
  )
  into result
  from public.barbershops shop
  left join public.barbershop_accounts account on account.barbershop_id = shop.id;

  return result;
end;
$$;

create or replace function public.purge_archived_barbershops()
returns table (
  deleted_barbershops integer,
  deleted_appointments integer,
  deleted_clients integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  shop_count integer := 0;
  appointment_count integer := 0;
  client_count integer := 0;
begin
  if not private.is_platform_admin_email(private.current_auth_email()) then
    raise exception 'Acesso restrito ao administrador da plataforma.';
  end if;

  drop table if exists pg_temp.agendapro_purge_ids;

  create temporary table agendapro_purge_ids on commit drop as
  select id
  from public.barbershops
  where archived_at is not null;

  select count(*) into shop_count from agendapro_purge_ids;

  if shop_count = 0 then
    return query select 0, 0, 0;
    return;
  end if;

  select count(*) into appointment_count
  from public.appointments item
  where item.barbershop_id in (select id from agendapro_purge_ids);

  select count(*) into client_count
  from public.clients item
  where item.barbershop_id in (select id from agendapro_purge_ids);

  delete from public.loyalty_events item
  where item.barbershop_id in (select id from agendapro_purge_ids)
     or item.appointment_id in (
       select appointment.id from public.appointments appointment
       where appointment.barbershop_id in (select id from agendapro_purge_ids)
     )
     or item.client_id in (
       select client.id from public.clients client
       where client.barbershop_id in (select id from agendapro_purge_ids)
     );

  delete from public.waitlist item
  where item.barbershop_id in (select id from agendapro_purge_ids);

  delete from public.feature_flags item
  where item.barbershop_id in (select id from agendapro_purge_ids);

  delete from public.appointments item
  where item.barbershop_id in (select id from agendapro_purge_ids);

  delete from public.schedule_blocks item
  where item.barbershop_id in (select id from agendapro_purge_ids);

  delete from public.days_off item
  where item.barbershop_id in (select id from agendapro_purge_ids);

  delete from public.schedule_breaks item
  where item.barbershop_id in (select id from agendapro_purge_ids);

  delete from public.working_hours item
  where item.barbershop_id in (select id from agendapro_purge_ids);

  delete from public.services item
  where item.barbershop_id in (select id from agendapro_purge_ids);

  delete from public.professionals item
  where item.barbershop_id in (select id from agendapro_purge_ids);

  delete from public.clients item
  where item.barbershop_id in (select id from agendapro_purge_ids);

  delete from public.barbershop_admins item
  where item.barbershop_id in (select id from agendapro_purge_ids);

  delete from public.barbershop_accounts item
  where item.barbershop_id in (select id from agendapro_purge_ids);

  delete from public.barbershops shop
  where shop.id in (select id from agendapro_purge_ids);

  return query select shop_count, appointment_count, client_count;
end;
$$;

create or replace function public.save_business_settings(
  target_slug text,
  name_input text,
  slug_input text,
  owner_email_input text,
  plan_input text,
  monthly_status_input text,
  next_billing_date_input date,
  logo_text_input text,
  logo_url_input text,
  whatsapp_input text,
  address_input text,
  maps_url_input text,
  theme_color_input text,
  theme_color_secondary_input text,
  pix_enabled_input boolean,
  pix_key_input text,
  pix_discount_input numeric,
  automatic_confirmation_enabled_input boolean,
  success_title_input text,
  success_message_input text,
  success_footer_input text,
  client_background_url_input text default null,
  admin_background_url_input text default null,
  client_background_opacity_input numeric default 0.18,
  admin_background_opacity_input numeric default 0.12
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  next_slug text;
begin
  target_id := private.barbershop_id_by_slug(target_slug);
  next_slug := coalesce(nullif(slug_input, ''), target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  if not private.can_manage_barbershop_as(target_id, array['owner']) then
    raise exception 'Apenas o dono pode alterar conta, pagamentos e dados principais desta barbearia.';
  end if;

  update public.barbershops
  set
    name = name_input,
    slug = next_slug,
    logo_text = logo_text_input,
    logo_url = nullif(logo_url_input, ''),
    whatsapp = whatsapp_input,
    address = address_input,
    maps_url = maps_url_input,
    theme_color = theme_color_input,
    theme_color_secondary = theme_color_secondary_input,
    pix_enabled = pix_enabled_input,
    pix_key = pix_key_input,
    pix_discount = pix_discount_input,
    automatic_confirmation_enabled = automatic_confirmation_enabled_input,
    success_title = success_title_input,
    success_message = success_message_input,
    success_footer = success_footer_input,
    client_background_url = nullif(client_background_url_input, ''),
    admin_background_url = nullif(admin_background_url_input, ''),
    client_background_opacity = least(greatest(coalesce(client_background_opacity_input, 0.18), 0), 0.7),
    admin_background_opacity = least(greatest(coalesce(admin_background_opacity_input, 0.12), 0), 0.7),
    updated_at = now()
  where id = target_id;

  insert into public.barbershop_accounts (
    barbershop_id,
    owner_email,
    plan,
    monthly_status,
    next_billing_date
  ) values (
    target_id,
    owner_email_input,
    plan_input,
    monthly_status_input,
    next_billing_date_input
  )
  on conflict (barbershop_id)
  do update set
    owner_email = excluded.owner_email,
    plan = excluded.plan,
    monthly_status = excluded.monthly_status,
    next_billing_date = excluded.next_billing_date,
    updated_at = now();
end;
$$;

create or replace function public.get_barbershop_accesses(target_slug text)
returns table (
  id uuid,
  email text,
  role text,
  active boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  if not private.can_manage_barbershop_as(target_id, array['owner']) then
    raise exception 'Apenas o dono pode ver os acessos desta barbearia.';
  end if;

  return query
  select
    admin.id,
    admin.email,
    admin.role,
    coalesce(admin.active, true) as active
  from public.barbershop_admins admin
  where admin.barbershop_id = target_id
  order by
    case private.normalized_barbershop_role(admin.role) when 'owner' then 1 else 2 end,
    admin.email;
end;
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
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  if not private.can_manage_barbershop_as(target_id, array['owner']) then
    raise exception 'Apenas o dono pode alterar acessos desta barbearia.';
  end if;

  update public.barbershop_admins
  set active = false
  where barbershop_id = target_id;

  for item in select * from jsonb_array_elements(accesses_input)
  loop
    clean_email := lower(trim(item->>'email'));
    clean_role := private.normalized_barbershop_role(coalesce(nullif(item->>'role', ''), 'employee'));
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

  if not exists (
    select 1
    from public.barbershop_admins admin
    where admin.barbershop_id = target_id
      and admin.active = true
      and private.normalized_barbershop_role(admin.role) = 'owner'
  ) then
    raise exception 'A barbearia precisa manter pelo menos um dono ativo.';
  end if;
end;
$$;

create or replace function public.save_feature_flags(
  target_slug text,
  features_input jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  item jsonb;
  is_platform boolean;
begin
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  is_platform := private.is_platform_admin_email(private.current_auth_email());

  if not is_platform and not private.can_manage_barbershop_as(target_id, array['owner']) then
    raise exception 'Apenas o dono pode ativar ou desativar melhorias desta barbearia.';
  end if;

  for item in select * from jsonb_array_elements(features_input)
  loop
    if is_platform then
      insert into public.feature_flags (
        barbershop_id,
        feature_key,
        enabled,
        released
      ) values (
        target_id,
        item->>'feature_key',
        coalesce((item->>'enabled')::boolean, false),
        coalesce((item->>'released')::boolean, false)
      )
      on conflict (barbershop_id, feature_key)
      do update set
        enabled = excluded.enabled,
        released = excluded.released,
        updated_at = now();
    else
      update public.feature_flags
      set
        enabled = coalesce((item->>'enabled')::boolean, false),
        updated_at = now()
      where barbershop_id = target_id
        and feature_key = item->>'feature_key'
        and released = true;
    end if;
  end loop;

  update public.barbershops
  set
    pro_service_delete_enabled = exists (
      select 1 from public.feature_flags
      where barbershop_id = target_id and feature_key = 'service_delete' and enabled and released
    ),
    pro_backplate_enabled = exists (
      select 1 from public.feature_flags
      where barbershop_id = target_id and feature_key = 'backplate' and enabled and released
    ),
    pro_appearance_media_enabled = exists (
      select 1 from public.feature_flags
      where barbershop_id = target_id and feature_key = 'appearance_media' and enabled and released
    ),
    pro_promotions_enabled = exists (
      select 1 from public.feature_flags
      where barbershop_id = target_id and feature_key = 'promotions' and enabled and released
    ),
    pro_waitlist_enabled = exists (
      select 1 from public.feature_flags
      where barbershop_id = target_id and feature_key = 'waitlist' and enabled and released
    ),
    pro_loyalty_enabled = exists (
      select 1 from public.feature_flags
      where barbershop_id = target_id and feature_key = 'loyalty' and enabled and released
    ),
    pro_instagram_enabled = exists (
      select 1 from public.feature_flags
      where barbershop_id = target_id
        and feature_key in ('instagram_booking', 'instagram')
        and enabled
        and released
    ),
    pro_google_client_enabled = exists (
      select 1 from public.feature_flags
      where barbershop_id = target_id
        and feature_key in ('google_login', 'google_client')
        and enabled
        and released
    ),
    updated_at = now()
  where id = target_id;
end;
$$;

create or replace function public.save_growth_settings(
  target_slug text,
  promotion_active_input boolean,
  promotion_title_input text,
  promotion_description_input text,
  promotion_discount_input numeric,
  promotion_start_date_input date,
  promotion_end_date_input date,
  loyalty_enabled_input boolean,
  loyalty_reward_description_input text,
  loyalty_visit_goal_input integer,
  loyalty_discount_input numeric,
  instagram_url_input text,
  google_client_login_enabled_input boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  if not private.can_manage_barbershop_as(target_id, array['owner']) then
    raise exception 'Apenas o dono pode configurar promocoes, fidelidade e canais.';
  end if;

  update public.barbershops
  set
    promotion_active = coalesce(promotion_active_input, false),
    promotion_title = coalesce(nullif(trim(promotion_title_input), ''), 'Promocao online'),
    promotion_description = coalesce(nullif(trim(promotion_description_input), ''), ''),
    promotion_discount = greatest(0, least(coalesce(promotion_discount_input, 0), 80)),
    promotion_start_date = promotion_start_date_input,
    promotion_end_date = promotion_end_date_input,
    loyalty_enabled = coalesce(loyalty_enabled_input, false),
    loyalty_reward_description = coalesce(nullif(trim(loyalty_reward_description_input), ''), ''),
    loyalty_visit_goal = greatest(1, coalesce(loyalty_visit_goal_input, 5)),
    loyalty_discount = greatest(0, least(coalesce(loyalty_discount_input, 0), 80)),
    instagram_url = nullif(trim(instagram_url_input), ''),
    google_client_login_enabled = coalesce(google_client_login_enabled_input, false),
    updated_at = now()
  where id = target_id;
end;
$$;

revoke update on public.barbershops from anon, authenticated;

revoke execute on function public.purge_archived_barbershops() from public, anon;
revoke execute on function public.save_growth_settings(text, boolean, text, text, numeric, date, date, boolean, text, integer, numeric, text, boolean) from public, anon;

grant execute on function public.purge_archived_barbershops() to authenticated;
grant execute on function public.save_growth_settings(text, boolean, text, text, numeric, date, date, boolean, text, integer, numeric, text, boolean) to authenticated;
