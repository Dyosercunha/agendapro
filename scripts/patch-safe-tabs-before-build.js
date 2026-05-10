const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname, '..', 'App.tsx');
let source = fs.readFileSync(appPath, 'utf8');
let changed = false;

if (!source.includes('const visibleAdminTabs = adminTabs.filter')) {
  const blocks = [
    'const canManageBilling =\n    normalizedAdminEmail === normalizedOwnerEmail ||\n    normalizeRole(currentAdminAccount?.role) === "desenvolvedor";',
    'const canManageBilling =\n    normalizedAdminEmail === normalizedOwnerEmail ||\n    currentAdminAccount?.role === "Desenvolvedor";',
    'const canManageBilling =\n    normalizedAdminEmail === normalizedOwnerEmail ||\n    currentAdminAccount?.role === "Plataforma";'
  ];
  const replacement = 'const adminPermissionRole = normalizeRole(currentAdminAccount?.role || (normalizedAdminEmail === normalizedOwnerEmail ? "dono" : "funcionario"));\n  const isDeveloperPermission = adminPermissionRole === "desenvolvedor";\n  const isOwnerPermission = adminPermissionRole === "dono" || normalizedAdminEmail === normalizedOwnerEmail;\n  const canManageBilling = isDeveloperPermission || isOwnerPermission;\n  const visibleAdminTabs = adminTabs.filter((tab) => canAccessAdminTab(adminPermissionRole, tab.id, isOwnerPermission));\n\n  useEffect(() => {\n    if (!adminLoggedIn || viewMode !== "admin") return;\n    if (canAccessAdminTab(adminPermissionRole, adminTab, isOwnerPermission)) return;\n    setAdminTab("dashboard");\n    setNotice({ type: "error", message: "Seu cargo não tem acesso a esta área." });\n  }, [adminLoggedIn, viewMode, adminPermissionRole, adminTab, isOwnerPermission]);';
  const found = blocks.find((block) => source.includes(block));
  if (found) {
    source = source.replace(found, replacement);
    changed = true;
  }
}

if (source.includes('visibleAdminTabs')) {
  const next = source.replace(/adminTabs\.map\(\(tab\) =>/g, 'visibleAdminTabs.map((tab) =>');
  if (next !== source) {
    source = next;
    changed = true;
  }
}

if (changed) fs.writeFileSync(appPath, source);
console.log(changed ? 'Role tab filter applied.' : 'Role tab filter skipped.');
