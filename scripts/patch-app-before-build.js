const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "App.tsx");
let source = fs.readFileSync(appPath, "utf8");

function replaceBetween(startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Não foi possível localizar bloco: ${startMarker}`);
  }
  source = source.slice(0, start) + replacement + "\n\n" + source.slice(end);
}

function replaceRequired(search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Não foi possível localizar trecho obrigatório: ${label || search}`);
  }
  source = source.replace(search, replacement);
}

// 1. Remover createClient duplicado e usar cliente único do projeto.
source = source.replace(
  'import { createClient } from "@supabase/supabase-js";\n',
  'import { supabase } from "./supabaseClient";\n'
);
source = source.replace(
  /const supabaseUrl =\n\s+import\.meta\.env\.VITE_SUPABASE_URL \|\| "https:\/\/opcuaxkndslmejhuauyq\.supabase\.co";\nconst supabaseAnonKey =\n\s+import\.meta\.env\.VITE_SUPABASE_ANON_KEY \|\| "[^"]+";\nconst supabase = createClient\(supabaseUrl, supabaseAnonKey\);\n/,
  ""
);

// 2. Padronizar cargos internamente e visualmente.
if (!source.includes("function normalizeRole(value)")) {
  const roleHelpers = `
function normalizeRole(value) {
  const role = String(value || "").trim().toLowerCase();
  if (["desenvolvedor", "developer", "platform", "plataforma"].includes(role)) return "desenvolvedor";
  if (["dono", "owner"].includes(role)) return "dono";
  if (["funcionario", "funcionário", "employee", "staff", "manager", "gerente"].includes(role)) return "funcionario";
  return "funcionario";
}

function roleLabel(value) {
  const role = normalizeRole(value);
  if (role === "desenvolvedor") return "Desenvolvedor";
  if (role === "dono") return "Dono";
  return "Funcionário";
}

function canAccessAdminTab(roleValue, tabId, isOwnerEmail = false) {
  const role = normalizeRole(roleValue);
  if (role === "desenvolvedor") return true;
  if (role === "dono" || isOwnerEmail) return true;
  return ["dashboard", "agenda", "customers", "services", "appearance"].includes(tabId);
}
`;
  replaceRequired(
    `const initialServices = [`,
    roleHelpers + `\nconst initialServices = [`,
    "inserção dos helpers de cargo"
  );
}

source = source.replace(
  /role: item\.role === "owner" \? "Dono" : item\.role === "platform" \? "Plataforma" : "Gerente",/g,
  `role: roleLabel(item.role),`
);
source = source.replace(/fixed: item\.role === "owner",/g, `fixed: normalizeRole(item.role) === "dono",`);
source = source.replace(/currentAdminAccount\?\.role === "Plataforma"/g, `normalizeRole(currentAdminAccount?.role) === "desenvolvedor"`);
source = source.replace(/"Plataforma"/g, `"Desenvolvedor"`);
source = source.replace(/"Gerente"/g, `"Funcionário"`);
source = source.replace(/>Plataforma</g, `>Desenvolvedor<`);
source = source.replace(/>Gerente</g, `>Funcionário<`);

// 3. localStorage deixa de ser fonte principal. Fica só como fallback manual via ?localFallback=1.
replaceBetween(
  "function readSavedData(key, fallback) {",
  "function saveData(key, value) {",
  `function readSavedData(key, fallback) {
  if (typeof window === "undefined") return fallback;

  const allowLocalFallback = new URLSearchParams(window.location.search).get("localFallback") === "1";
  if (!allowLocalFallback) return fallback;

  try {
    const saved = window.localStorage.getItem(storageKey(key));
    if (!saved) return fallback;
    return mergeWithDefault(fallback, JSON.parse(saved));
  } catch {
    return fallback;
  }
}`
);

replaceBetween(
  "function saveData(key, value) {",
  "function removeSavedData() {",
  `function saveData(key, value) {
  if (typeof window === "undefined") return;

  const allowLocalFallback = new URLSearchParams(window.location.search).get("localFallback") === "1";
  if (!allowLocalFallback) return;

  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    console.warn("Não foi possível salvar os dados no navegador.");
  }
}`
);

// 4. Evitar salvamento infinito: qualquer estado cloudSaving se auto-limpa se uma chamada travar.
source = source.replace(
  `const [cloudSaving, setCloudSaving] = useState("");`,
  `const [cloudSaving, setRawCloudSaving] = useState("");
  function setCloudSaving(value) {
    setRawCloudSaving(value);
    if (value && typeof window !== "undefined") {
      window.setTimeout(() => {
        setRawCloudSaving((current) => (current === value ? "" : current));
      }, 12000);
    }
  }`
);

// 5. Atualizar textos de sincronização para refletir fonte principal na nuvem.
source = source.replace(/Local \+ online/g, "Nuvem como fonte principal");
source = source.replace(
  /O app mantém uma cópia local para abrir rápido e salva as configurações principais na nuvem quando você usa os botões de salvar\./g,
  "O Supabase é a fonte principal dos dados. O navegador só usa fallback local quando aberto com ?localFallback=1."
);
source = source.replace(/Usando dados locais\./g, "Usando fallback local de emergência.");

fs.writeFileSync(appPath, source);
console.log("AgendaPro: App.tsx limpo e padronizado antes do build.");
