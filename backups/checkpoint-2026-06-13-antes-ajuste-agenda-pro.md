# Backup checkpoint - AgendaPro

Data: 2026-06-13

Checkpoint criado antes de ajustar a rota `/agenda-pro` para evitar confusão entre a marca AgendaPro e uma barbearia real.

## Estado antes do ajuste

- `src/main.tsx` renderiza `LandingPage` apenas na raiz `/`.
- Qualquer outra rota que não seja plataforma renderiza `App`.
- Isso permite que `/agenda-pro` caia dentro do app principal e possa ser interpretado como slug/fallback.

## Ajuste planejado

- Tratar `/agenda-pro` e `/agenda-pro/` como rota institucional/landing page.
- Manter rotas oficiais:
  - `/` → LandingPage
  - `/agenda-pro` → LandingPage
  - `/agendamento/{slug}` → App/tela do cliente
  - `/painel/{slug}` → App/painel da barbearia
  - `/plataforma?platform=1` → PlatformDashboard

## Motivo

Evitar que `agenda-pro` seja usado como barbearia real ou fallback de dados.
