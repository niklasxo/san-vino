import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/app/App";
import "@/styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Häufig genutzte Seiten im Leerlauf vorladen → Wechsel zu Scan & Ergebnis ohne Ladepause.
const warmUp = () => {
  void import("@/pages/scan");
  void import("@/pages/scan-result");
  void import("@/pages/scan-item");
  void import("@/pages/home");
};
if ("requestIdleCallback" in window) window.requestIdleCallback(warmUp, { timeout: 4000 });
else setTimeout(warmUp, 2500);
