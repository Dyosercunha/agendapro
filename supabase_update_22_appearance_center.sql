-- AgendaPro SQL 22
-- Central premium de aparencia da barbearia.
--
-- Execute depois do SQL 21.

alter table public.barbershops
  add column if not exists welcome_message text default 'Escolha seu atendimento, veja horarios disponiveis e agende pelo celular.',
  add column if not exists theme_mode text default 'dark',
  add column if not exists rating_value numeric(2,1) default 5.0,
  add column if not exists rating_text text default 'Avaliacao informada pela barbearia';

alter table public.barbershops
  drop constraint if exists barbershops_theme_mode_check;

alter table public.barbershops
  add constraint barbershops_theme_mode_check
  check (theme_mode in ('dark', 'light'));

create or replace function public.save_appearance_center(
  target_slug text,
  theme_mode_input text,
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
begin
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  if not private.can_manage_barbershop_as(target_id, array['owner']) then
    raise exception 'Apenas o dono pode alterar a aparencia desta barbearia.';
  end if;

  update public.barbershops
  set
    theme_mode = case when theme_mode_input = 'light' then 'light' else 'dark' end,
    welcome_message = nullif(trim(coalesce(welcome_message_input, '')), ''),
    rating_value = least(greatest(coalesce(rating_value_input, 5.0), 0), 5),
    rating_text = nullif(trim(coalesce(rating_text_input, '')), ''),
    updated_at = now()
  where id = target_id;
end;
$$;

grant execute on function public.save_appearance_center(text, text, text, numeric, text)
to authenticated;
