-- AgendaPro: habilita atualizacao em tempo real dos agendamentos.
-- Execute no Supabase SQL Editor se a Agenda Hoje nao atualizar sem recarregar.

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'appointments'
  ) then
    alter publication supabase_realtime add table public.appointments;
  end if;
end $$;

select exists (
  select 1
  from pg_publication_tables
  where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'appointments'
) as appointments_realtime_enabled;
