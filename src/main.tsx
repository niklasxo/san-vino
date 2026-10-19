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

// Neue App-Versionen sofort übernehmen: Der Service Worker (autoUpdate) aktiviert sich direkt,
// danach laden wir einmal neu. Beim Öffnen/Zurückkehren wird aktiv nach Updates gesucht –
// sonst sähe man eine neue Version erst beim übernächsten Öffnen der Home-Bildschirm-App.
if ("serviceWorker" in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloading) return; // Erstinstallation: nichts neu zu laden
    reloading = true;
    window.location.reload();
  });
  const checkForUpdate = () =>
    navigator.serviceWorker
      .getRegistration()
      .then((r) => r?.update())
      .catch(() => undefined);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void checkForUpdate();
  });
  setInterval(checkForUpdate, 30 * 60 * 1000);
}
