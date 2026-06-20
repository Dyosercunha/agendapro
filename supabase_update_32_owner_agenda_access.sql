-- AgendaPro: corrige acesso do dono aos agendamentos do proprio painel.
-- Use quando o desenvolvedor ve a agenda, mas o dono da barbearia nao ve.

insert into public.barbershop_admins (barbershop_id, email, role, active)
select
  account.barbershop_id,
  lower(trim(account.owner_email)),
  'owner',
  true
from public.barbershop_accounts account
join public.barbershops shop on shop.id = account.barbershop_id
where nullif(trim(coalesce(account.owner_email, '')), '') is not null
  and account.owner_email like '%@%'
  and shop.archived_at is null
on conflict (barbershop_id, email)
do update set
  active = true,
  role = case
    when public.barbershop_admins.role = 'platform' then public.barbershop_admins.role
    else 'owner'
  end;

create or replace function public.get_my_admin_context(target_slug text)
returns table (
  access_type text,
  barbershop_id uuid,
  slug text,
  role text,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;
  clean_target_slug text;
begin
  current_email := private.current_auth_email();
  clean_target_slug := lower(trim(coalesce(target_slug, '')));

  if current_email = '' then
    return;
  end if;

  if private.is_platform_admin_email(current_email) then
    return query
    select 'platform'::text, null::uuid, null::text, 'platform'::text, current_email;
    return;
  end if;

  return query
  select
    'barbershop'::text,
    shop.id,
    shop.slug,
    private.normalized_barbershop_role(admin.role),
    current_email
  from public.barbershop_admins admin
  join public.barbershops shop on shop.id = admin.barbershop_id
  where lower(admin.email) = current_email
    and coalesce(admin.active, true) = true
    and shop.archived_at is null
    and (clean_target_slug = '' or shop.slug = clean_target_slug)
  order by
    case private.normalized_barbershop_role(admin.role)
      when 'platform' then 1
      when 'owner' then 2
      else 3
    end,
    admin.created_at
  limit 1;
end;
$$;

create or replace function public.get_my_admin_context()
returns table (
  access_type text,
  barbershop_id uuid,
  slug text,
  role text,
  email text
)
language sql
security definer
set search_path = public
as $$
  select * from public.get_my_admin_context(null::text);
$$;

revoke all on function public.get_my_admin_context(text) from public;
revoke all on function public.get_my_admin_context() from public;
grant execute on function public.get_my_admin_context(text) to authenticated;
grant execute on function public.get_my_admin_context() to authenticated;

select
  shop.slug,
  account.owner_email,
  admin.role,
  admin.active
from public.barbershop_accounts account
join public.barbershops shop on shop.id = account.barbershop_id
left join public.barbershop_admins admin
  on admin.barbershop_id = account.barbershop_id
  and lower(admin.email) = lower(account.owner_email)
where shop.archived_at is null
order by shop.created_at desc;
