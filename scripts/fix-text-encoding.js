const fs = require("fs");

const files = [
  "App.tsx",
  "App.txt",
  "App_facil.txt",
  "PlatformDashboard.tsx",
  "SafeBackplatePanel.tsx",
  "SafeGrowthPanel.tsx",
  "SafeServiceDelete.tsx",
  "public/platform-fix.js",
  "public/role-permissions.js",
  "scripts/patch-app-before-build.js",
  "scripts/patch-premium-appearance-before-build.js",
  "scripts/patch-platform-dashboard-before-build.js",
  "scripts/patch-platform-archive-button-before-build.js",
  "scripts/patch-platform-soft-delete-before-build.js",
  "scripts/patch-permissions-before-build.js",
  "scripts/patch-safe-tabs-before-build.js",
  "scripts/patch-local-cache-button-before-build.js",
  "supabase_update_09_full_sync.sql",
  "supabase_update_10_prevent_double_booking.sql",
];

const replacements = [
  ["\u00c3\u00a1", "á"],
  ["\u00c3 ", "à"],
  ["\u00c3\u00a0", "à"],
  ["\u00c3\u00a2", "â"],
  ["\u00c3\u00a3", "ã"],
  ["\u00c3\u00a4", "ä"],
  ["\u00c3\u00a9", "é"],
  ["\u00c3\u00a8", "è"],
  ["\u00c3\u00aa", "ê"],
  ["\u00c3\u00ad", "í"],
  ["\u00c3\u00ac", "ì"],
  ["\u00c3\u00b3", "ó"],
  ["\u00c3\u00b2", "ò"],
  ["\u00c3\u00b4", "ô"],
  ["\u00c3\u00b5", "õ"],
  ["\u00c3\u00ba", "ú"],
  ["\u00c3\u00b9", "ù"],
  ["\u00c3\u00bc", "ü"],
  ["\u00c3\u00a7", "ç"],
  ["\u00c3\u0081", "Á"],
  ["\u00c3\u0080", "À"],
  ["\u00c3\u0082", "Â"],
  ["\u00c3\u0083", "Ã"],
  ["\u00c3\u0089", "É"],
  ["\u00c3\u008a", "Ê"],
  ["\u00c3\u0093", "Ó"],
  ["\u00c3\u0094", "Ô"],
  ["\u00c3\u0095", "Õ"],
  ["\u00c3\u009a", "Ú"],
  ["\u00c3\u0087", "Ç"],
  ["\u00c2\u00b7", "·"],
  ["\u00c2\u00ba", "º"],
  ["\u00c2\u00aa", "ª"],
  ["\u00e2\u0080\u0094", "-"],
  ["\u00e2\u0080\u0093", "-"],
  ["\u00e2\u009c\u0093", "✓"],
  ["\u00e2\u0086\u0092", "→"],
  ["\u00e2\u0080\u0098", "'"],
  ["\u00e2\u0080\u0099", "'"],
  ["\u00e2\u0080\u009c", '"'],
  ["\u00e2\u0080\u009d", '"'],
  ["\u00e2\u0080\u00a6", "..."],
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const original = fs.readFileSync(file, "utf8");
  let next = original;

  for (const [broken, fixed] of replacements) {
    next = next.split(broken).join(fixed);
  }

  if (next !== original) {
    fs.writeFileSync(file, next);
    console.log(`fixed ${file}`);
  }
}
