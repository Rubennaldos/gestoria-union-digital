import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Usa HashRouter siempre (más simple para GH Pages)
// Si quieres, puedes hacer condicional: PROD -> Hash, DEV -> Browser
import { HashRouter /* BrowserRouter */ } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
  <HashRouter>
    <App />
  </HashRouter>
);
