-- Execute este arquivo no SQL Editor do Supabase.
-- Ele salva as configuracoes de promocoes inteligentes por barbearia.

create schema if not exists private;

alter table public.barbershops
  add column if not exists promotion_title text default 'Promocao online',
  add column if not exists promotion_description text default 'Desconto especial para agendamentos feitos pelo app.',
  add column if not exists promotion_discount numeric default 10;

create or replace function private.barbershop_id_by_slug(target_slug text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id
  from public.barbershops
  where slug = target_slug
  limit 1;
$$;

create or replace function public.save_promotion_settings(
  target_slug text,
  promotion_title_input text,
  promotion_description_input text,
  promotion_discount_input numeric
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

  update public.barbershops
  set
    promotion_title = nullif(trim(promotion_title_input), ''),
    promotion_description = coalesce(nullif(trim(promotion_description_input), ''), ''),
    promotion_discount = greatest(0, least(coalesce(promotion_discount_input, 0), 80)),
    updated_at = now()
  where id = target_id;
end;
$$;

grant execute on function public.save_promotion_settings(text, text, text, numeric) to anon, authenticated;

update public.barbershops
set
  promotion_title = coalesce(promotion_title, 'Promocao online'),
  promotion_description = coalesce(promotion_description, 'Desconto especial para agendamentos feitos pelo app.'),
  promotion_discount = coalesce(promotion_discount, 10)
where slug = 'barbearia-do-joao';

insert into public.feature_flags (barbershop_id, feature_key, enabled, released)
select id, 'promotions', true, true
from public.barbershops
where slug = 'barbearia-do-joao'
on conflict (barbershop_id, feature_key)
do update set
  enabled = true,
  released = true,
  updated_at = now();

select
  slug,
  promotion_title,
  promotion_description,
  promotion_discount
from public.barbershops
where slug = 'barbearia-do-joao';
