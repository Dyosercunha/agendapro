# Backup checkpoint - AgendaPro

Data: 2026-06-13

Checkpoint criado antes de seguir com os próximos ajustes de RPC pública e testes finais.

## Estado confirmado

- Último deploy em produção: READY
- Commit em produção confirmado pela Vercel: `6a8514c3c1635939c10887babefa71d8af31ba61`
- Mensagem do commit: `Fix urgent script syntax`

## Ajustes já encaminhados antes deste checkpoint

- Correção de rota pública para `/agendamento/{slug}` via script de build.
- Correção de replace de rota para `/agendamento/{slug}` via script de build.
- Adição de chamada `checkPublicSlotAvailability` via script de build.
- Blindagem de acesso para manter Dono ativo via script de build.
- Documentação dos ajustes urgentes em `docs/ajustes-urgentes-agendapro.md`.

## Próximos passos planejados

1. Adicionar migração SQL da RPC pública `check_public_slot_availability`.
2. Validar se a RPC foi aplicada no Supabase.
3. Testar `/agendamento/master`.
4. Testar `/painel/master`.
5. Testar Conta → adicionar acesso.
6. Testar confirmação de agendamento sem chamar `get_admin_appointments` no fluxo público.

## Observação

Este arquivo serve como checkpoint textual de segurança antes de novos ajustes.
