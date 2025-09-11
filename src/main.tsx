// src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// ⬇️ NUEVO: provider que lee la config de RTDB
import { BillingConfigProvider } from "@/contexts/BillingConfigContext";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <BillingConfigProvider>
        <App />
      </BillingConfigProvider>
    </HashRouter>
  </React.StrictMode>
);
