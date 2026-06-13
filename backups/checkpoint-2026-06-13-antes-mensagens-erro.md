# Backup checkpoint - AgendaPro

Data: 2026-06-13

Checkpoint criado antes dos ajustes de limpeza das mensagens de erro exibidas para usuário final.

## Estado anterior

- Front preparado para rota `/agendamento/{slug}` via script de build.
- Front preparado para validar disponibilidade com `check_public_slot_availability` via script de build.
- Migration SQL da RPC pública adicionada em `supabase/migrations/20260613145500_check_public_slot_availability.sql`.
- Checkpoint anterior criado em `backups/checkpoint-2026-06-13-antes-rpc-e-testes.md`.

## Próximo ajuste

Adicionar proteção para não exibir detalhes técnicos como `P0001`, `permission denied`, `RPC`, `get_admin_appointments` e objetos JSON brutos para cliente/barbeiro comum.
