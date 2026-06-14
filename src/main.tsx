import "./features/auth/networkTimeoutGuard";
import "./fixes/banner-text-fixes.css";
import "./visual-polish.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import LandingPage from "./features/landing/LandingPage";
import PlatformDashboard from "./features/platform-dashboard/PlatformDashboard";
import { applyGlobalSeo, applyLandingSeo, applyPlatformSeo } from "./lib/seo";

const container = document.getElementById("root");
const path = window.location.pathname.toLowerCase().replace(/\/$/, "") || "/";
const routeParts = path.split("/").filter(Boolean);
const routeHead = routeParts[0] || "";
const reservedRoutes = new Set([
  "agendamento",
  "agenda-pro",
  "api",
  "assets",
  "barbearia",
  "manifest.json",
  "painel",
  "painel-plataforma",
  "plataforma",
  "sw.js",
]);
const isLegacyBareSlugRoute = routeParts.length === 1 && routeHead && !reservedRoutes.has(routeHead);

if (isLegacyBareSlugRoute) {
  window.location.replace(`/agendamento/${routeHead}${window.location.search}${window.location.hash}`);
}

const isRootRoute = !isLegacyBareSlugRoute && (path === "/" || path === "/agenda-pro");
const isPlatformRoute =
  !isLegacyBareSlugRoute &&
  (window.location.search.includes("platform=1") ||
    path.includes("/plataforma") ||
    path.includes("/painel-plataforma"));

if (isPlatformRoute) {
  applyPlatformSeo();
} else if (isRootRoute) {
  applyLandingSeo();
} else {
  applyGlobalSeo();
}

if ("serviceWorker" in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onRegistered() {
      console.info("[AgendaPro] PWA registrada");
    },
    onOfflineReady() {
      console.info("[AgendaPro] App pronto para uso offline");
    },
    onNeedRefresh() {
      console.info("[AgendaPro] Nova versão disponível");
      updateSW(true);
    },
  });
}

if (container && !isLegacyBareSlugRoute) {
  const app = isPlatformRoute
    ? React.createElement(PlatformDashboard)
    : isRootRoute
    ? React.createElement(LandingPage)
    : React.createElement(App);
  createRoot(container).render(React.createElement(React.StrictMode, null, app));
}
