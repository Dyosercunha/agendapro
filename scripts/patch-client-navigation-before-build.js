const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "..", "App.tsx");
let source = fs.readFileSync(appPath, "utf8");
let changed = false;

if (!source.includes("function goToClientView()")) {
  const marker = /\n  function enterAdminWithEmail\(email\) \{[\s\S]*?\n  \}\n\n  function handleAuthSession/;
  const replacement = `
  function enterAdminWithEmail(email) {
    setAdminEmail(email || "");
    setAdminLoggedIn(true);
    setAdminLoginError("");
    setBarberGateError("");
    setAdminTab("dashboard");
    setViewMode("admin");
    window.scrollTo(0, 0);
  }

  function goToClientView() {
    const slug = business.slug || cloudSlug || initialBusiness.slug;

    setScreen("home");
    setSelectedServices([]);
    setSelectedTime("");
    setPayment("");
    setConfirmedId("");
    setConfirmationSent(false);
    setWaitlistSent(false);

    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/agendamento/" + slug);
      window.scrollTo(0, 0);
    }

    setViewMode("client");
  }

  function handleAuthSession`;

  if (!marker.test(source)) {
    throw new Error("Não encontrei o ponto correto para inserir goToClientView em App.tsx.");
  }

  source = source.replace(marker, replacement);
  changed = true;
}

const authBlock = `    if (isAdminEmailAllowed(email)) {
      enterAdminWithEmail(email);
      return;
    }`;
const guardedAuthBlock = `    if (isAdminEmailAllowed(email)) {
      const path = typeof window !== "undefined" ? window.location.pathname : "";
      const isPanelRoute = path.split("/").filter(Boolean).includes("painel");

      if (viewMode !== "client" || isPanelRoute) {
        enterAdminWithEmail(email);
      }

      return;
    }`;

if (source.includes(authBlock)) {
  source = source.replace(authBlock, guardedAuthBlock);
  changed = true;
}

source = source.replace(/onClick=\{\(\) => setViewMode\("client"\)\}/g, () => {
  changed = true;
  return "onClick={() => goToClientView()}";
});

source = source.replace(/onClick=\{\(\) => \{\s*setViewMode\("client"\);\s*setScreen\("home"\);\s*\}\}/g, () => {
  changed = true;
  return "onClick={() => goToClientView()}";
});

source = source.replace(/\n    setViewMode\("client"\);\n    setScreen\("home"\);\n    window\.scrollTo\(0, 0\);/g, () => {
  changed = true;
  return "\n    goToClientView();";
});

if (changed) {
  fs.writeFileSync(appPath, source);
  console.log("Client navigation patch applied.");
} else {
  console.log("Client navigation patch already applied.");
}
