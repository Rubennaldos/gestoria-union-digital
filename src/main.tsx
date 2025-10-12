import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { BillingConfigProvider } from "@/contexts/BillingConfigContext";

import { ensureMessagingReady } from "./messaging";
ensureMessagingReady(); // solo prepara

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <BillingConfigProvider>
        <App />
      </BillingConfigProvider>
    </HashRouter>
  </React.StrictMode>
);
