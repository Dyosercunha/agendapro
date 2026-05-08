import "./networkTimeoutGuard";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import PlatformDashboard from "./PlatformDashboard";
import SafeBackplatePanel from "./SafeBackplatePanel";
import SafeServiceDelete from "./SafeServiceDelete";

const container = document.getElementById("root");
const path = window.location.pathname.toLowerCase();
const isPlatformRoute = window.location.search.includes("platform=1") || path.includes("/plataforma") || path.includes("/painel-plataforma");

if (container) {
  const app = isPlatformRoute
    ? React.createElement(PlatformDashboard)
    : React.createElement(React.Fragment, null, React.createElement(App), React.createElement(SafeBackplatePanel), React.createElement(SafeServiceDelete));
  createRoot(container).render(React.createElement(React.StrictMode, null, app));
}
