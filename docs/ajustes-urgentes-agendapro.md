# Ajustes urgentes AgendaPro

Este arquivo registra os ajustes prioritários antes de vender o app em escala.

## 1. Rotas oficiais

Manter as rotas oficiais:

```text
/                         -> landing page AgendaPro
/agendamento/{slug}       -> tela pública do cliente
/painel/{slug}            -> painel da barbearia
/plataforma?platform=1    -> painel plataforma
```

Remover o uso de `/{slug}` como link principal de cliente.

No `src/App.tsx`, ajustar:

```ts
const publicScheduleLink = `${appOrigin}/agendamento/${routeSlug || "barbearia"}`;
```

E ao trocar slug, usar:

```ts
if (scheduleIndex !== -1) window.history.replaceState(null, "", `/agendamento/${nextSlug}`);
```

## 2. Dono ativo obrigatório

Antes de salvar acessos, normalizar a lista para garantir que `business.ownerEmail` exista como Dono ativo.

Adicionar helpers ao `src/App.tsx`:

```ts
function ensureActiveOwnerAccess(accounts, ownerEmail) {
  const cleanOwnerEmail = String(ownerEmail || "").trim().toLowerCase();
  const normalized = accounts.map((account) => ({
    ...account,
    email: String(account.email || "").trim().toLowerCase(),
  }));

  if (!cleanOwnerEmail) return normalized;

  const ownerIndex = normalized.findIndex((account) => account.email === cleanOwnerEmail);

  if (ownerIndex >= 0) {
    normalized[ownerIndex] = {
      ...normalized[ownerIndex],
      role: "Dono",
      active: true,
      fixed: true,
    };
    return normalized;
  }

  return [
    {
      id: null,
      email: cleanOwnerEmail,
      role: "Dono",
      active: true,
      fixed: true,
      password: "",
      passwordConfirm: "",
    },
    ...normalized,
  ];
}

function hasActiveOwner(accounts) {
  return accounts.some(
    (account) =>
      account.active !== false &&
      normalizeRole(account.role) === "dono" &&
      String(account.email || "").includes("@")
  );
}
```

No `saveAccessAccountsToCloud`, trocar:

```ts
const activeAccounts = accessAccounts.filter((account) => account.active !== false);
```

por:

```ts
const normalizedAccessAccounts = ensureActiveOwnerAccess(accessAccounts, business.ownerEmail);
const activeAccounts = normalizedAccessAccounts.filter((account) => account.active !== false);

if (!hasActiveOwner(activeAccounts)) {
  return { error: { message: "A barbearia precisa manter pelo menos um Dono ativo." } };
}
```

E enviar `normalizedAccessAccounts` no payload de `saveBarbershopAccesses`.

## 3. Agendamento público seguro

A tela pública não deve depender de `get_admin_appointments`.

Criar RPC pública:

```sql
create or replace function public.check_public_slot_availability(
  target_slug text,
  target_date date,
  target_time text,
  target_professional text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_barbershop_id uuid;
  conflict_count integer := 0;
begin
  select id
  into target_barbershop_id
  from public.barbershops
  where slug = target_slug
    and archived_at is null
  limit 1;

  if target_barbershop_id is null then
    return jsonb_build_object('available', false, 'reason', 'barbershop_not_found');
  end if;

  select count(*)
  into conflict_count
  from public.appointments
  where barbershop_id = target_barbershop_id
    and date = target_date
    and time = target_time
    and coalesce(status, 'confirmed') not in ('cancelled', 'canceled')
    and (
      target_professional is null
      or target_professional = ''
      or professional = target_professional
      or target_professional = 'Primeiro disponível'
    );

  return jsonb_build_object('available', conflict_count = 0, 'conflicts', conflict_count);
end;
$$;

grant execute on function public.check_public_slot_availability(text, date, text, text) to anon;
grant execute on function public.check_public_slot_availability(text, date, text, text) to authenticated;
```

Depois criar no `src/lib/appointmentsApi.ts`:

```ts
export function checkPublicSlotAvailability(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("check_public_slot_availability", payload);
}
```

E usar essa função no fluxo público antes de confirmar o agendamento.

## 4. Mensagens de erro

Para usuário final, esconder detalhes técnicos como `P0001`, `permission denied`, `RPC` e nome de função.

Exemplos:

```text
A barbearia precisa manter pelo menos um Dono ativo.
Esse horário acabou de ser reservado. Escolha outro horário.
Não foi possível salvar online. Confira a conexão e tente novamente.
```

Detalhe técnico deve ficar apenas no painel plataforma ou console.
