# Backup antes dos ajustes urgentes

Data: 2026-06-03

Este arquivo marca o ponto de segurança antes da próxima rodada de alterações no AgendaPro.

## Estado de referência

Arquivos principais observados antes da alteração:

- `src/App.tsx`
  - blob SHA: `19a4580a79ad974794d5e0bcb9e0275cf0814ff9`
- `src/lib/appointmentsApi.ts`
  - blob SHA: `5192bafbb8452c982aa63c365ab79aa741867ab5`
- `package.json`
  - blob SHA: `2b9bba8b01dda779c10dabeb3d0dc51580164457`

## Objetivo da próxima alteração

1. Padronizar link público para `/agendamento/{slug}`.
2. Garantir Dono ativo antes de salvar acessos.
3. Preparar chamada pública segura de disponibilidade de horário.
4. Evitar erro de função administrativa no fluxo público.

## Observação

Este backup é lógico/documental dentro do Git. Como cada alteração vira commit separado, qualquer ajuste pode ser revertido pelo histórico do repositório.
