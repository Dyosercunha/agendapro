-- AgendaPro: personalizacao de texto sem quebrar a assinatura antiga da RPC.
-- A funcao de 5 argumentos continua existente para manter producao compativel.

alter table public.barbershops
  add column if not exists theme_text_color text;

alter table public.barbershops
  drop constraint if exists barbershops_theme_text_color_check;

alter table public.barbershops
  add constraint barbershops_theme_text_color_check
  check (
    theme_text_color is null
    or theme_text_color ~ '^#[0-9A-Fa-f]{6}$'
  );

create or replace function public.save_appearance_center(
  target_slug text,
  theme_mode_input text,
  theme_text_color_input text,
  welcome_message_input text,
  rating_value_input numeric,
  rating_text_input text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  normalized_text_color text;
begin
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  if not private.can_manage_barbershop_as(target_id, array['owner']) then
    raise exception 'Apenas o dono pode alterar a aparencia desta barbearia.';
  end if;

  perform public.assert_feature(target_slug, 'temas_personalizados');

  normalized_text_color := nullif(lower(trim(coalesce(theme_text_color_input, ''))), '');

  if normalized_text_color is not null
    and normalized_text_color !~ '^#[0-9a-f]{6}$' then
    raise exception 'Cor de texto invalida. Use o formato hexadecimal #RRGGBB.';
  end if;

  update public.barbershops
  set
    theme_mode = case when theme_mode_input = 'light' then 'light' else 'dark' end,
    theme_text_color = normalized_text_color,
    welcome_message = nullif(trim(coalesce(welcome_message_input, '')), ''),
    rating_value = least(greatest(coalesce(rating_value_input, 5.0), 0), 5),
    rating_text = nullif(trim(coalesce(rating_text_input, '')), ''),
    updated_at = now()
  where id = target_id;
end;
$$;

revoke execute on function public.save_appearance_center(text, text, text, text, numeric, text)
from public, anon;

grant execute on function public.save_appearance_center(text, text, text, text, numeric, text)
to authenticated;

comment on column public.barbershops.theme_text_color is
  'Cor base opcional dos textos. NULL usa contraste automatico conforme o tema.';
