import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Provider existente
import { BillingConfigProvider } from "@/contexts/BillingConfigContext";

// ✅ Prepara Firebase Messaging SIN pedir permisos todavía
import { ensureMessagingReady } from "./messaging";
ensureMessagingReady();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <BillingConfigProvider>
        <App />
      </BillingConfigProvider>
    </HashRouter>
  </React.StrictMode>
);
