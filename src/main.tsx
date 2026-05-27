import "./features/auth/networkTimeoutGuard";
import "./features/improvements/pro-features.css";
import "./fixes/banner-text-fixes.css";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import LandingPage from "./features/landing/LandingPage";
import PlatformDashboard from "./features/platform-dashboard/PlatformDashboard";

const container = document.getElementById("root");
const path = window.location.pathname.toLowerCase();
const isRootRoute = path === "/" || path === "";
const isPlatformRoute = window.location.search.includes("platform=1") || path.includes("/plataforma") || path.includes("/painel-plataforma");

if (container) {
  const app = isPlatformRoute
    ? React.createElement(PlatformDashboard)
    : isRootRoute
    ? React.createElement(LandingPage)
    : React.createElement(App);
  createRoot(container).render(React.createElement(React.StrictMode, null, app));
}
