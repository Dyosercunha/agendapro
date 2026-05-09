const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "App.tsx");
let source = fs.readFileSync(appPath, "utf8");

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Trecho não encontrado no patch de permissões: ${label || search.slice(0, 80)}`);
  source = source.replace(search, replacement);
}

// Garante helpers de cargo/permissão mesmo depois do patch principal.
if (!source.includes("function permissionRole(value)")) {
  source = source.replace(
    `const initialServices = [`,
    `function permissionRole(value){const r=String(value||"").trim().toLowerCase();if(["desenvolvedor","developer","platform","plataforma"].includes(r))return"desenvolvedor";if(["dono","owner"].includes(r))return"dono";return"funcionario";}\nfunction permissionRoleLabel(value){const r=permissionRole(value);return r==="desenvolvedor"?"Desenvolvedor":r==="dono"?"Dono":"Funcionário";}\nfunction canOpenAdminTabByRole(roleValue,tabId,isOwnerEmail=false){const r=permissionRole(roleValue);if(r==="desenvolvedor")return true;if(r==="dono"||isOwnerEmail)return true;return["dashboard","agenda","customers","services","appearance"].includes(tabId);}\nfunction deniedTabMessage(roleValue,tabId){const r=permissionRoleLabel(roleValue);return r+" não tem acesso a "+tabId+".";}\n\nconst initialServices = [`
  );
}

source = source.replace(/role: item\.role === "owner" \? "Dono" : item\.role === "platform" \? "Plataforma" : "Gerente",/g, `role: permissionRoleLabel(item.role),`);
source = source.replace(/fixed: item\.role === "owner",/g, `fixed: permissionRole(item.role) === "dono",`);
source = source.replace(/currentAdminAccount\?\.role === "Plataforma"/g, `permissionRole(currentAdminAccount?.role) === "desenvolvedor"`);
source = source.replace(/currentAdminAccount\?\.role === "Desenvolvedor"/g, `permissionRole(currentAdminAccount?.role) === "desenvolvedor"`);
source = source.replace(/"Plataforma"/g, `"Desenvolvedor"`).replace(/"Gerente"/g, `"Funcionário"`).replace(/>Plataforma</g, `>Desenvolvedor<`).replace(/>Gerente</g, `>Funcionário<`);

const canManageOld = `const canManageBilling =
    normalizedAdminEmail === normalizedOwnerEmail ||
    currentAdminAccount?.role === "Desenvolvedor";`;
const canManageNew = `const currentPermissionRole = permissionRole(currentAdminAccount?.role || (normalizedAdminEmail === normalizedOwnerEmail ? "dono" : "funcionario"));
  const isDeveloperRole = currentPermissionRole === "desenvolvedor";
  const isOwnerRole = currentPermissionRole === "dono" || normalizedAdminEmail === normalizedOwnerEmail;
  const isEmployeeRole = currentPermissionRole === "funcionario";
  const canManageBilling = isDeveloperRole || isOwnerRole;
  const visibleAdminTabs = adminTabs.filter((tab)=>canOpenAdminTabByRole(currentPermissionRole,tab.id,isOwnerRole));`;
if (source.includes(canManageOld)) source = source.replace(canManageOld, canManageNew);

// Impede troca manual para aba sem permissão, mesmo se algum botão antigo ainda existir.
replaceOnce(
  `useEffect(()=>{if(typeof window!=="undefined"){window.__agendaProAdminTab=adminTab;window.__agendaProViewMode=viewMode;window.__agendaProAdminLoggedIn=adminLoggedIn;}},[adminTab,viewMode,adminLoggedIn]);`,
  `useEffect(()=>{if(adminLoggedIn&&viewMode==="admin"&&!canOpenAdminTabByRole(currentPermissionRole,adminTab,isOwnerRole)){setNotice({type:"error",message:"Seu cargo não tem acesso a esta área."});setAdminTab("dashboard");}},[adminTab,adminLoggedIn,viewMode,currentPermissionRole,isOwnerRole]);\n  useEffect(()=>{if(typeof window!=="undefined"){window.__agendaProAdminTab=adminTab;window.__agendaProViewMode=viewMode;window.__agendaProAdminLoggedIn=adminLoggedIn;}},[adminTab,viewMode,adminLoggedIn]);`,
  "watch de aba admin"
);

// Troca renderização da navegação para usar visibleAdminTabs quando encontrar adminTabs.map.
source = source.replace(/adminTabs\.map\(\(tab\) =>/g, `visibleAdminTabs.map((tab) =>`);

// Bloqueio visual de seções sensíveis que podem estar renderizadas por estado antigo.
source = source.replace(/adminTab === "payments"/g, `(canManageBilling && adminTab === "payments")`);
source = source.replace(/adminTab === "account"/g, `(canManageBilling && adminTab === "account")`);
source = source.replace(/adminTab === "improvements"/g, `((isDeveloperRole || isOwnerRole) && adminTab === "improvements")`);

// Ao entrar no painel, começa sempre em aba permitida.
source = source.replace(/setAdminTab\("dashboard"\);/g, `setAdminTab("dashboard");`);

// Adiciona aviso compacto no topo do painel se encontrar cabeçalho do admin.
if (!source.includes("permissionBanner")) {
  source = source.replace(
    `{adminLoggedIn ? (`,
    `{adminLoggedIn ? (<> <div className="permissionBanner"><strong>{permissionRoleLabel(currentPermissionRole)}</strong><span>{isDeveloperRole?"Acesso total":isOwnerRole?"Plano, conta, pagamentos e configurações principais":"Agenda, clientes, serviços básicos e aparência"}</span></div>`
  );
  source = source.replace(`) : null}`, `</>) : null}`);
}

fs.writeFileSync(appPath, source);
console.log("AgendaPro: permissões por cargo aplicadas antes do build.");
