import "./networkTimeoutGuard";
import "./pro-features.css";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import LandingPage from "./LandingPage";
import PlatformDashboard from "./PlatformDashboard";

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
