-- AgendaPro SQL 25
-- Foto dos profissionais para aparecer no painel da barbearia e na tela pública do cliente.

alter table public.professionals
  add column if not exists photo_url text;

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
        photo_url = nullif(item->>'photo_url', ''),
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
        photo_url,
        commission_percent,
        commission_by_service
      ) values (
        target_id,
        item->>'name',
        coalesce((item->>'active')::boolean, true),
        coalesce((item->>'fixed')::boolean, false),
        nullif(item->>'photo_url', ''),
        greatest(0, least(100, coalesce((item->>'commission_percent')::numeric, 0))),
        coalesce(item->'commission_by_service', '{}'::jsonb)
      );
    end if;
  end loop;
end;
$$;

grant execute on function public.save_professionals(text, jsonb) to authenticated;
