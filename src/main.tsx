import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Provider existente
import { BillingConfigProvider } from "@/contexts/BillingConfigContext";

// ⬇️ NUEVO: inicializador de Firebase Cloud Messaging
import { initMessaging } from "./messaging";

// Inicia FCM (no bloquea el render). Imprime el token en consola si todo va bien.
initMessaging();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <BillingConfigProvider>
        <App />
      </BillingConfigProvider>
    </HashRouter>
  </React.StrictMode>
);
