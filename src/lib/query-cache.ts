/**
 * Sofortstart: Profil, gespeicherte Weine, letzte Scans und Swipe-Antworten werden zusätzlich im Browser
 * gehalten. Beim nächsten Öffnen erscheint die App damit ohne Ladebildschirm (auch offline) und lädt im
 * Hintergrund frische Daten. Der Zwischenspeicher gilt nur für dieselbe anonyme Nutzer-ID.
 */
import type { QueryClient, QueryKey } from "@tanstack/react-query";

const CACHE_KEY = "vino-cache-v1";
const SESSION_KEY = "vino-session"; // = storageKey des Supabase-Clients
const PERSISTED_ROOTS = new Set(["profile", "saved-wines", "recent-scans", "taste-swipes"]);

type Entry = { key: QueryKey; data: unknown; updatedAt: number };
type Stored = { userId: string; entries: Entry[] };

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Nutzer-ID der im Browser gespeicherten Supabase-Sitzung (ohne Netzwerk). */
export function storedUserId(): string | null {
  try {
    const raw = storage()?.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    const id = s?.user?.id ?? s?.currentSession?.user?.id;
    return typeof id === "string" && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

// Nur die Liste gespeicherter Weine („saved-wines“) – keine Einzel- oder Zuordnungsabfragen.
const isPersisted = (key: QueryKey) => PERSISTED_ROOTS.has(String(key[0])) && (key[0] !== "saved-wines" || key.length === 1);

export function hydrateQueryCache(qc: QueryClient) {
  const userId = storedUserId();
  if (!userId) {
    // Erstbesuch (noch keine Sitzung): Es gibt sicher noch kein Profil → Willkommensseite sofort zeigen,
    // die anonyme Anmeldung läuft im Hintergrund. updatedAt 0 = veraltet → wird trotzdem frisch geladen.
    qc.setQueryData(["profile"], { userId: "", tasteType: null, onboardingCompleted: false, answers: {}, taste: null }, { updatedAt: 0 });
    return;
  }
  try {
    const raw = storage()?.getItem(CACHE_KEY);
    if (!raw) return;
    const stored = JSON.parse(raw) as Stored;
    if (stored.userId !== userId) return;
    // Ohne abgeschlossenes Profil nichts vorwegnehmen: Ein veralteter Stand („noch kein Profil“, z. B. direkt
    // nach dem Onboarding gespeichert) würde sonst fälschlich zur Willkommensseite umleiten.
    const profile = stored.entries.find((e) => e.key[0] === "profile")?.data as { onboardingCompleted?: boolean } | undefined;
    if (!profile?.onboardingCompleted) return;
    for (const e of stored.entries) if (isPersisted(e.key)) qc.setQueryData(e.key, e.data, { updatedAt: e.updatedAt });
  } catch {
    /* defekter Eintrag – einfach ohne Zwischenspeicher starten */
  }
}

export function persistQueryCache(qc: QueryClient) {
  let timer: number | undefined;
  const write = () => {
    timer = undefined;
    const userId = storedUserId();
    const store = storage();
    if (!store) return;
    try {
      if (!userId) return store.removeItem(CACHE_KEY);
      const entries: Entry[] = qc
        .getQueryCache()
        .getAll()
        .filter((q) => q.state.status === "success" && q.state.data !== undefined && isPersisted(q.queryKey))
        .map((q) => ({ key: q.queryKey, data: q.state.data, updatedAt: q.state.dataUpdatedAt }));
      store.setItem(CACHE_KEY, JSON.stringify({ userId, entries } satisfies Stored));
    } catch {
      /* Speicher voll / gesperrt – die App funktioniert auch ohne */
    }
  };
  // Beim Schließen/Wechseln der App sofort sichern, nicht erst nach der kurzen Bündelungspause.
  const flush = () => {
    if (timer === undefined) return;
    window.clearTimeout(timer);
    write();
  };
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush());
  return qc.getQueryCache().subscribe((event) => {
    if (!isPersisted(event.query.queryKey)) return;
    if (event.type !== "updated" && event.type !== "removed") return;
    window.clearTimeout(timer);
    timer = window.setTimeout(write, 300);
  });
}

export function clearQueryCache() {
  try {
    storage()?.removeItem(CACHE_KEY);
  } catch {
    /* ignorieren */
  }
}
