import { useEffect, type RefObject } from "react";

/**
 * Sprachmenü: das gemeinsame Übersetzungs-Widget der Projekte von niklasschneider.me
 * (https://niklasschneider.me/translate/widget.js). Wählt jemand eine andere Sprache, gehen die Texte
 * der Seite an niklasschneider.me und werden dort mit Cloudflare Workers AI übersetzt
 * (siehe Datenschutz, Abschnitt „Übersetzung“). Die Wahl merkt sich der Browser unter „ns.tlang“.
 */
type Widget = { mount: (el?: HTMLElement | null) => void };
type WidgetWindow = Window & { NSTranslate?: Widget };

const SRC = "https://niklasschneider.me/translate/widget.js";
let loading: Promise<Widget> | null = null;

function loadWidget(): Promise<Widget> {
  loading ??= new Promise<Widget>((resolve, reject) => {
    const w = window as WidgetWindow;
    if (w.NSTranslate) return resolve(w.NSTranslate);
    const s = document.createElement("script");
    s.src = SRC;
    // Kein eigener Knopf: das Menü sitzt dort, wo die Seite es einbaut (useLanguageMenu).
    s.dataset.ui = "none";
    s.onload = () => (w.NSTranslate ? resolve(w.NSTranslate) : reject(new Error("translate")));
    s.onerror = () => {
      loading = null;
      s.remove();
      reject(new Error("translate"));
    };
    document.head.append(s);
  });
  return loading;
}

/** Lädt das Widget gleich beim Start, damit eine früher gewählte Sprache sofort gilt. */
export function startTranslation() {
  if (import.meta.env.MODE === "test") return;
  try {
    if ((localStorage.getItem("ns.tlang") ?? "de") === "de") return;
  } catch {
    return;
  }
  void loadWidget().catch(() => {});
}

/** Setzt den Sprach-Knopf in `slot` (Aussehen über die --nt-*-Variablen in index.css). */
export function useLanguageMenu(slot: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
    let gone = false;
    loadWidget()
      .then((w) => !gone && w.mount(slot.current))
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, [slot]);
}
