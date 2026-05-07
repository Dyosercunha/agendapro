import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import PlatformDashboard from "./PlatformDashboard";
import NativeBarberEnhancements from "./NativeBarberEnhancements";

const container = document.getElementById("root");
const path = window.location.pathname.toLowerCase();
const isPlatformRoute =
  window.location.search.includes("platform=1") ||
  path.includes("/plataforma") ||
  path.includes("/painel-plataforma");

if (container) {
  createRoot(container).render(
    <React.StrictMode>
      {isPlatformRoute ? (
        <PlatformDashboard />
      ) : (
        <>
          <App />
          <NativeBarberEnhancements />
        </>
      )}
    </React.StrictMode>
  );
}
