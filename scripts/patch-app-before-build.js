const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "App.tsx");
let source = fs.readFileSync(appPath, "utf8");

function replaceBetween(startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start === -1 || end === -1 || end <= start) throw new Error(`Não foi possível localizar bloco: ${startMarker}`);
  source = source.slice(0, start) + replacement + "\n\n" + source.slice(end);
}
function replaceRequired(search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Não foi possível localizar trecho obrigatório: ${label || search}`);
  source = source.replace(search, replacement);
}

source = source.replace('import { createClient } from "@supabase/supabase-js";\n', 'import { supabase } from "./supabaseClient";\n');
source = source.replace(/const supabaseUrl =\n\s+import\.meta\.env\.VITE_SUPABASE_URL \|\| "https:\/\/opcuaxkndslmejhuauyq\.supabase\.co";\nconst supabaseAnonKey =\n\s+import\.meta\.env\.VITE_SUPABASE_ANON_KEY \|\| "[^"]+";\nconst supabase = createClient\(supabaseUrl, supabaseAnonKey\);\n/, "");

if (!source.includes("function normalizeRole(value)")) {
  replaceRequired(
    `const initialServices = [`,
    `function normalizeRole(value){const r=String(value||"").trim().toLowerCase();if(["desenvolvedor","developer","platform","plataforma"].includes(r))return"desenvolvedor";if(["dono","owner"].includes(r))return"dono";return"funcionario";}\nfunction roleLabel(value){const r=normalizeRole(value);return r==="desenvolvedor"?"Desenvolvedor":r==="dono"?"Dono":"Funcionário";}\nfunction canAccessAdminTab(roleValue,tabId,isOwnerEmail=false){const r=normalizeRole(roleValue);if(r==="desenvolvedor")return true;if(r==="dono"||isOwnerEmail)return true;return["dashboard","agenda","customers","services","appearance"].includes(tabId);}\n\nconst initialServices = [`,
    "helpers de cargo"
  );
}

source = source.replace(/role: item\.role === "owner" \? "Dono" : item\.role === "platform" \? "Plataforma" : "Gerente",/g, `role: roleLabel(item.role),`);
source = source.replace(/fixed: item\.role === "owner",/g, `fixed: normalizeRole(item.role) === "dono",`);
source = source.replace(/currentAdminAccount\?\.role === "Plataforma"/g, `normalizeRole(currentAdminAccount?.role) === "desenvolvedor"`);
source = source.replace(/"Plataforma"/g, `"Desenvolvedor"`).replace(/"Gerente"/g, `"Funcionário"`).replace(/>Plataforma</g, `>Desenvolvedor<`).replace(/>Gerente</g, `>Funcionário<`);

replaceBetween("function readSavedData(key, fallback) {", "function saveData(key, value) {", `function readSavedData(key, fallback){if(typeof window==="undefined")return fallback;const ok=new URLSearchParams(window.location.search).get("localFallback")==="1";if(!ok)return fallback;try{const saved=window.localStorage.getItem(storageKey(key));return saved?mergeWithDefault(fallback,JSON.parse(saved)):fallback;}catch{return fallback;}}`);
replaceBetween("function saveData(key, value) {", "function removeSavedData() {", `function saveData(key, value){if(typeof window==="undefined")return;const ok=new URLSearchParams(window.location.search).get("localFallback")==="1";if(!ok)return;try{window.localStorage.setItem(storageKey(key),JSON.stringify(value));}catch{console.warn("Não foi possível salvar os dados no navegador.");}}`);

source = source.replace(
  `const [cloudSaving, setCloudSaving] = useState("");`,
  `const [cloudSaving,setRawCloudSaving]=useState("");\n  function setCloudSaving(value){setRawCloudSaving(value);if(value&&typeof window!=="undefined"){window.setTimeout(()=>setRawCloudSaving(c=>c===value?"":c),12000);}}`
);

// Remove o painel PRO global que estava aparecendo na tela de acesso.
// Os recursos devem ser posicionados dentro das abas corretas do App.tsx, não renderizados no portão de login.
if (source.includes("function CoreAgendaProApp()")) {
  source = source.replace(/export default function App\(\)\{return <>\s*<CoreAgendaProApp\/>\s*<AppProFeatures\/>\s*<\/>;\}/g, "export default function App(){return <CoreAgendaProApp/>;}");
  source = source.replace(/export default function App\(\)\{return <><CoreAgendaProApp\/><AppProFeatures\/><\/>;\}/g, "export default function App(){return <CoreAgendaProApp/>;}");
}

source = source.replace(/Local \+ online/g, "Nuvem como fonte principal");
source = source.replace(/O app mantém uma cópia local para abrir rápido e salva as configurações principais na nuvem quando você usa os botões de salvar\./g, "O Supabase é a fonte principal dos dados. O navegador só usa fallback local quando aberto com ?localFallback=1.");
source = source.replace(/Usando dados locais\./g, "Usando fallback local de emergência.");

fs.writeFileSync(appPath, source);
console.log("AgendaPro: App.tsx corrigido sem painel PRO global no acesso da barbearia.");
