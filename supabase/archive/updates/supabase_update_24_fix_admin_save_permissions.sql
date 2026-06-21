-- AgendaPro SQL 24
-- Reparo seguro de permissoes das RPCs administrativas.
--
-- Pode ser executado mesmo se alguma RPC de modulo novo ainda nao existir.
-- O bloco abaixo aplica permissao somente nas funcoes encontradas no banco.

do $$
declare
  signature text;
  fn regprocedure;
  admin_signatures text[] := array[
    'public.save_services(text,jsonb)',
    'public.soft_delete_service(text,uuid)',
    'public.soft_delete_service_by_name(text,text)',
    'public.save_professionals(text,jsonb)',
    'public.save_schedule_settings(text,integer,jsonb,jsonb,jsonb,jsonb)',
    'public.save_barbershop_accesses(text,jsonb)',
    'public.save_feature_flags(text,jsonb)',
    'public.save_promotion_settings(text,text,text,numeric)',
    'public.save_promotions(text,jsonb)',
    'public.save_background_settings(text,text,text,numeric,numeric)',
    'public.save_appearance_center(text,text,text,numeric,text)',
    'public.save_premium_appearance(text,text,text,text,text,numeric,numeric,text,text,text,text,text,text)',
    'public.save_business_settings(text,text,text,text,text,text,date,text,text,text,text,text,text,text,boolean,text,numeric,boolean,text,text,text,text,text,numeric,numeric)',
    'public.update_appointment_action(text,uuid,boolean,text,boolean)',
    'public.update_appointment_action(text,uuid,boolean,text,boolean,text,text)',
    'public.update_waitlist_status(text,uuid,text)'
  ];
begin
  foreach signature in array admin_signatures
  loop
    fn := to_regprocedure(signature);

    if fn is not null then
      execute format('revoke execute on function %s from public, anon', fn);
      execute format('grant execute on function %s to authenticated', fn);
      raise notice 'Permissao ajustada: %', signature;
    else
      raise notice 'Funcao ainda nao existe, ignorada: %', signature;
    end if;
  end loop;
end;
$$;

-- Diagnostico rapido.
-- Esperado para save_services:
-- authenticated = true
-- anon = false
select
  to_regprocedure('public.save_services(text,jsonb)') is not null as save_services_existe,
  case
    when to_regprocedure('public.save_services(text,jsonb)') is null then null
    else has_function_privilege('authenticated', 'public.save_services(text,jsonb)', 'EXECUTE')
  end as save_services_authenticated,
  case
    when to_regprocedure('public.save_services(text,jsonb)') is null then null
    else has_function_privilege('anon', 'public.save_services(text,jsonb)', 'EXECUTE')
  end as save_services_anon,
  to_regprocedure('public.save_appearance_center(text,text,text,numeric,text)') is not null as save_appearance_center_existe;
