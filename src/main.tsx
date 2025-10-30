import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { ensureMessagingReady } from "./messaging";
import { addAdminDeportesModule } from "./utils/addAdminDeportesModule";

ensureMessagingReady(); // solo prepara

// Exponer función para agregar módulo desde consola
(window as any).addAdminDeportesModule = addAdminDeportesModule;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
