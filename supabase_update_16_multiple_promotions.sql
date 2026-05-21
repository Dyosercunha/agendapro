-- AgendaPro SQL 16
-- Multiple intelligent promotions with discount or final promotional price.

alter table public.barbershops
  add column if not exists promotions jsonb not null default '[]'::jsonb;

update public.barbershops
set promotions = jsonb_build_array(
  jsonb_build_object(
    'id', 'promo-online',
    'title', coalesce(promotion_title, 'Promoção online'),
    'description', coalesce(promotion_description, ''),
    'type', 'discount',
    'discountPercent', greatest(0, least(coalesce(promotion_discount, 0), 80)),
    'discountValue', 0,
    'promotionalPrice', 0,
    'active', true
  )
)
where jsonb_array_length(coalesce(promotions, '[]'::jsonb)) = 0
  and (
    coalesce(promotion_title, '') <> ''
    or coalesce(promotion_description, '') <> ''
    or coalesce(promotion_discount, 0) > 0
  );

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

  with raw_promotions as (
    select value, ordinality
    from jsonb_array_elements(coalesce(promotions_input, '[]'::jsonb)) with ordinality
    limit 20
  ),
  cleaned as (
    select jsonb_build_object(
      'id', coalesce(nullif(value->>'id', ''), 'promo-' || ordinality::text),
      'title', coalesce(nullif(trim(value->>'title'), ''), 'Promoção'),
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
          when lower(coalesce(value->>'active', 'true')) in ('false', '0', 'no', 'nao', 'não')
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

grant execute on function public.save_promotions(text, jsonb) to anon, authenticated;

select
  slug,
  jsonb_array_length(promotions) as promotions_count
from public.barbershops
order by updated_at desc nulls last
limit 10;
