import "./features/auth/networkTimeoutGuard";
import "./fixes/banner-text-fixes.css";
import "./visual-polish.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import LandingPage from "./features/landing/LandingPage";
import PlatformDashboard from "./features/platform-dashboard/PlatformDashboard";
import {
  buildBookingPath,
  isLegacyBareSlugPath,
  isPlatformRoutePath,
  isRootRoutePath,
  routePartsFromPathname,
} from "./lib/routes";
import { applyGlobalSeo, applyLandingSeo, applyPlatformSeo } from "./lib/seo";

const container = document.getElementById("root");
const routeParts = routePartsFromPathname(window.location.pathname);
const routeHead = routeParts[0] || "";
const isLegacyBareSlugRoute = isLegacyBareSlugPath(window.location.pathname);

if (isLegacyBareSlugRoute) {
  window.location.replace(`${buildBookingPath(routeHead)}${window.location.search}${window.location.hash}`);
}

const isRootRoute = !isLegacyBareSlugRoute && isRootRoutePath(window.location.pathname);
const isPlatformRoute = !isLegacyBareSlugRoute && isPlatformRoutePath(window.location.pathname, window.location.search);

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
