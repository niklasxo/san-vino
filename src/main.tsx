import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { startTranslation } from "@/lib/translate";
import App from "@/app/App";
import "@/styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Alle Seiten vorladen (zusammen klein) → jeder Wechsel ohne Ladepause, und nach einem App-Update fehlen
// der laufenden Version keine Dateien. Erst NACH dem ersten Bildschirm – sonst konkurriert es beim
// Erstbesuch über Mobilfunk mit dem, was gerade gebraucht wird (gemessen: +0,6 s bis zum ersten Inhalt).
const warmUp = async () => {
  await Promise.allSettled([import("@/pages/home"), import("@/pages/scan"), import("@/pages/scan-result"), import("@/pages/scan-item")]);
  void import("@/pages/my-wines");
  void import("@/pages/saved-wine");
  void import("@/pages/taste");
  void import("@/pages/taste-swipe");
  void import("@/pages/my-wine");
  void import("@/pages/ratings");
  void import("@/pages/welcome");
  void import("@/pages/onboarding");
  void import("@/pages/onboarding-result");
};
const scheduleWarmUp = () =>
  window.setTimeout(() => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(() => void warmUp(), { timeout: 3000 });
    else void warmUp();
  }, 2500);
if (document.readyState === "complete") scheduleWarmUp();
else window.addEventListener("load", scheduleWarmUp, { once: true });

// Neue App-Versionen übernehmen: Der Service Worker (autoUpdate) aktiviert sich direkt. Neu geladen wird
// aber nur, wenn es niemand merkt – direkt beim Öffnen oder bei der Rückkehr nach über einer Minute.
// Nie mitten in der Nutzung: Die Kamera schickt die App auf dem iPhone kurz in den Hintergrund,
// deshalb nie beim Scannen und nie nach kurzer Abwesenheit (Foto in der Vorschau ginge verloren).
if ("serviceWorker" in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  const openedAt = Date.now();
  let reloading = false;
  let updateWaiting = false;
  let hiddenAt = 0;
  const reload = () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  };
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) return; // Erstinstallation: nichts neu zu laden
    if (Date.now() - openedAt < 4_000) reload();
    else updateWaiting = true;
  });
  const checkForUpdate = () =>
    navigator.serviceWorker
      .getRegistration()
      .then((r) => r?.update())
      .catch(() => undefined);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      return;
    }
    const away = hiddenAt > 0 && Date.now() - hiddenAt > 60_000;
    if (updateWaiting && away && !window.location.pathname.startsWith("/scan")) return reload();
    void checkForUpdate();
  });
  setInterval(checkForUpdate, 30 * 60 * 1000);
}

// Früher eine andere Sprache gewählt? Dann gleich übersetzen (lib/translate.ts).
startTranslation();
