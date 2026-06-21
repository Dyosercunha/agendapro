-- AgendaPro SQL 17
-- Owner plan requests without allowing owners to edit billing status or due date.

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
  requested_plan text;
  is_platform boolean;
begin
  target_id := private.barbershop_id_by_slug(target_slug);
  next_slug := coalesce(nullif(slug_input, ''), target_slug);
  requested_plan := coalesce(nullif(plan_input, ''), 'professional');
  is_platform := private.is_platform_admin_email(private.current_auth_email());

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  if requested_plan not in ('starter', 'professional', 'premium') then
    raise exception 'Plano invalido.';
  end if;

  if not private.can_manage_barbershop_as(target_id, array['owner']) then
    raise exception 'Apenas o desenvolvedor ou o dono podem alterar esta barbearia.';
  end if;

  update public.barbershops
  set
    name = name_input,
    slug = case when is_platform then next_slug else slug end,
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

  if is_platform then
    insert into public.barbershop_accounts (
      barbershop_id,
      owner_email,
      plan,
      monthly_status,
      next_billing_date
    ) values (
      target_id,
      lower(owner_email_input),
      requested_plan,
      coalesce(nullif(monthly_status_input, ''), 'trial'),
      next_billing_date_input
    )
    on conflict (barbershop_id)
    do update set
      owner_email = excluded.owner_email,
      plan = excluded.plan,
      monthly_status = excluded.monthly_status,
      next_billing_date = excluded.next_billing_date,
      updated_at = now();
  else
    update public.barbershop_accounts account
    set
      plan = requested_plan,
      monthly_status = 'pending',
      updated_at = now()
    where account.barbershop_id = target_id
      and account.plan is distinct from requested_plan;
  end if;
end;
$$;

grant execute on function public.save_business_settings(
  text,
  text,
  text,
  text,
  text,
  text,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  text,
  numeric,
  boolean,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric
) to anon, authenticated;
