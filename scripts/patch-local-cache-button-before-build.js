const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'App.tsx');
let source = fs.readFileSync(file, 'utf8');

if (!source.includes('handleClearLocalCache')) {
  source = source.replace(
    '  function isAdminEmailAllowed(email) {',
    '  function handleClearLocalCache() {\n    removeSavedData();\n    setNotice({ type: "success", message: "Cache local limpo. Recarregando dados da nuvem..." });\n    window.setTimeout(() => window.location.reload(), 350);\n  }\n\n  function isAdminEmailAllowed(email) {'
  );
}

if (!source.includes('localCacheClearButton')) {
  source = source.replace(
    '{adminLoggedIn ? (',
    '{adminLoggedIn ? (<button type="button" className="localCacheClearButton" onClick={handleClearLocalCache}>Limpar cache local</button>'
  );
  source = source.replace(') : null}', '<></>) : null}');
}

fs.writeFileSync(file, source);
console.log('Local cache button injected.');
