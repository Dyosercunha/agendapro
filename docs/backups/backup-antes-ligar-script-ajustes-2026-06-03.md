# Backup antes de ligar o script de ajustes urgentes

Data: 2026-06-03

## Commit anterior de segurança

- Backup lógico inicial: `7e0b202457e3d558de9fcc2698f891502ceffb2e`
- Script criado: `47f0a5d3707eb9651e8b6bc4728d274df864e044`

## Próxima ação

Ligar o script `scripts/fix-urgent-agendapro.mjs` ao processo de build para aplicar automaticamente:

1. Link público oficial `/agendamento/{slug}`.
2. Dono ativo obrigatório no salvamento de acessos.
3. Chamada pública `check_public_slot_availability` no fluxo de confirmação.

## Observação

Se o build falhar, desfazer a alteração do `package.json` e manter o script como referência manual.
