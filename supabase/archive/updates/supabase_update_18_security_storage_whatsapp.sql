-- AgendaPro SQL 18
-- Security hardening for owner/manager permissions and real image uploads.
--
-- What this adds:
-- 1. Public Storage bucket for barbershop images.
-- 2. Storage policies: anyone can view images; only platform/admin owner can upload
--    inside the folder of their own barbershop slug.
-- 3. Safer RPC permissions for appearance and promotions.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'agendapro-assets',
  'agendapro-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id)
do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_manage_agendapro_asset(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.can_manage_barbershop_as(
    private.barbershop_id_by_slug(split_part(coalesce(object_name, ''), '/', 1)),
    array['owner']
  );
$$;

grant execute on function public.can_manage_agendapro_asset(text) to authenticated;

drop policy if exists "agendapro assets public read" on storage.objects;
create policy "agendapro assets public read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'agendapro-assets');

drop policy if exists "agendapro assets owner insert" on storage.objects;
create policy "agendapro assets owner insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'agendapro-assets'
  and public.can_manage_agendapro_asset(name)
);

drop policy if exists "agendapro assets owner update" on storage.objects;
create policy "agendapro assets owner update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'agendapro-assets'
  and public.can_manage_agendapro_asset(name)
)
with check (
  bucket_id = 'agendapro-assets'
  and public.can_manage_agendapro_asset(name)
);

drop policy if exists "agendapro assets owner delete" on storage.objects;
create policy "agendapro assets owner delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'agendapro-assets'
  and public.can_manage_agendapro_asset(name)
);

create or replace function public.save_background_settings(
  target_slug text,
  client_background_url_input text,
  admin_background_url_input text,
  client_background_opacity_input numeric,
  admin_background_opacity_input numeric
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
    client_background_url = nullif(client_background_url_input, ''),
    admin_background_url = nullif(admin_background_url_input, ''),
    client_background_opacity = least(greatest(coalesce(client_background_opacity_input, 0.18), 0), 0.7),
    admin_background_opacity = least(greatest(coalesce(admin_background_opacity_input, 0.12), 0), 0.7),
    updated_at = now()
  where id = target_id;
end;
$$;

create or replace function public.save_success_texts(
  target_slug text,
  success_title_input text,
  success_message_input text,
  success_footer_input text
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
    raise exception 'Apenas o dono pode alterar os textos desta barbearia.';
  end if;

  update public.barbershops
  set
    success_title = coalesce(nullif(success_title_input, ''), success_title),
    success_message = coalesce(nullif(success_message_input, ''), success_message),
    success_footer = coalesce(nullif(success_footer_input, ''), success_footer),
    updated_at = now()
  where id = target_id;
end;
$$;

create or replace function public.save_appearance_media(
  target_slug text,
  before_image_url_input text,
  process_image_url_input text,
  final_image_url_input text,
  before_image_label_input text,
  process_image_label_input text,
  final_image_label_input text
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
    before_image_url = nullif(before_image_url_input, ''),
    process_image_url = nullif(process_image_url_input, ''),
    final_image_url = nullif(final_image_url_input, ''),
    before_image_label = coalesce(nullif(before_image_label_input, ''), 'Antes'),
    process_image_label = coalesce(nullif(process_image_label_input, ''), 'Processo'),
    final_image_label = coalesce(nullif(final_image_label_input, ''), 'Finalizado'),
    updated_at = now()
  where id = target_id;
end;
$$;

create or replace function public.save_premium_appearance(
  target_slug text,
  logo_url_input text,
  theme_color_input text,
  client_background_url_input text,
  admin_background_url_input text,
  client_background_opacity_input numeric,
  admin_background_opacity_input numeric,
  before_image_url_input text,
  process_image_url_input text,
  final_image_url_input text,
  before_image_label_input text,
  process_image_label_input text,
  final_image_label_input text
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
    logo_url = nullif(logo_url_input, ''),
    theme_color = coalesce(nullif(theme_color_input, ''), theme_color),
    client_background_url = nullif(client_background_url_input, ''),
    admin_background_url = nullif(admin_background_url_input, ''),
    client_background_opacity = least(greatest(coalesce(client_background_opacity_input, 0.18), 0), 0.7),
    admin_background_opacity = least(greatest(coalesce(admin_background_opacity_input, 0.12), 0), 0.7),
    before_image_url = nullif(before_image_url_input, ''),
    process_image_url = nullif(process_image_url_input, ''),
    final_image_url = nullif(final_image_url_input, ''),
    before_image_label = coalesce(nullif(before_image_label_input, ''), 'Antes'),
    process_image_label = coalesce(nullif(process_image_label_input, ''), 'Processo'),
    final_image_label = coalesce(nullif(final_image_label_input, ''), 'Finalizado'),
    updated_at = now()
  where id = target_id;
end;
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

  if not private.can_manage_barbershop_as(target_id, array['owner']) then
    raise exception 'Apenas o dono pode alterar as promocoes desta barbearia.';
  end if;

  update public.barbershops
  set
    promotion_title = nullif(trim(promotion_title_input), ''),
    promotion_description = nullif(trim(promotion_description_input), ''),
    promotion_discount = greatest(0, least(coalesce(promotion_discount_input, 0), 80)),
    updated_at = now()
  where id = target_id;
end;
$$;

create or replace function public.save_promotions(
  target_slug text,
  promotions_input jsonb
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  target_id uuid;
  sanitized_promotions jsonb;
  first_promotion jsonb;
begin
  target_id := private.barbershop_id_by_slug(target_slug);

  if target_id is null then
    raise exception 'Barbearia nao encontrada.';
  end if;

  if not private.can_manage_barbershop_as(target_id, array['owner']) then
    raise exception 'Apenas o dono pode alterar as promocoes desta barbearia.';
  end if;

  with raw_promotions as (
    select value, ordinality
    from jsonb_array_elements(coalesce(promotions_input, '[]'::jsonb)) with ordinality
    limit 20
  ),
  cleaned as (
    select jsonb_build_object(
      'id', coalesce(nullif(value->>'id', ''), 'promo-' || ordinality::text),
      'title', coalesce(nullif(trim(value->>'title'), ''), 'Promocao'),
      'description', coalesce(nullif(trim(value->>'description'), ''), ''),
      'type',
        case
          when lower(coalesce(value->>'type', value->>'mode', value->>'kind', 'discount')) = 'price'
            then 'price'
          else 'discount'
        end,
      'discountPercent', greatest(
        0,
        least(
          case
            when coalesce(value->>'discountPercent', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
              then (value->>'discountPercent')::numeric
            else 0
          end,
          80
        )
      ),
      'discountValue', greatest(
        0,
        case
          when coalesce(value->>'discountValue', value->>'discountAmount', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
            then coalesce(value->>'discountValue', value->>'discountAmount')::numeric
          else 0
        end
      ),
      'promotionalPrice', greatest(
        0,
        case
          when coalesce(value->>'promotionalPrice', value->>'promoPrice', value->>'price', value->>'value', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
            then coalesce(value->>'promotionalPrice', value->>'promoPrice', value->>'price', value->>'value')::numeric
          else 0
        end
      ),
      'active',
        case
          when lower(coalesce(value->>'active', 'true')) in ('false', '0', 'no', 'nao')
            then false
          else true
        end
    ) as promotion
    from raw_promotions
  )
  select coalesce(jsonb_agg(promotion), '[]'::jsonb)
  into sanitized_promotions
  from cleaned;

  first_promotion := sanitized_promotions->0;

  update public.barbershops
  set
    promotions = sanitized_promotions,
    promotion_title = coalesce(first_promotion->>'title', promotion_title),
    promotion_description = coalesce(first_promotion->>'description', promotion_description),
    promotion_discount = coalesce((first_promotion->>'discountPercent')::numeric, promotion_discount),
    updated_at = now()
  where id = target_id;
end;
$$;

revoke execute on function public.save_promotions(text, jsonb) from public, anon;
grant execute on function public.save_promotions(text, jsonb) to authenticated;

revoke execute on function public.save_background_settings(text, text, text, numeric, numeric) from public, anon;
grant execute on function public.save_background_settings(text, text, text, numeric, numeric) to authenticated;

revoke execute on function public.save_promotion_settings(text, text, text, numeric) from public, anon;
grant execute on function public.save_promotion_settings(text, text, text, numeric) to authenticated;

revoke execute on function public.save_success_texts(text, text, text, text) from public, anon;
grant execute on function public.save_success_texts(text, text, text, text) to authenticated;

revoke execute on function public.save_appearance_media(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.save_appearance_media(text, text, text, text, text, text, text) to authenticated;

revoke execute on function public.save_premium_appearance(text, text, text, text, text, numeric, numeric, text, text, text, text, text, text) from public, anon;
grant execute on function public.save_premium_appearance(text, text, text, text, text, numeric, numeric, text, text, text, text, text, text) to authenticated;
