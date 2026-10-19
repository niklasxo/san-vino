import * as React from "react";
import { ensureAnonymousSession, SessionError } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { storedUserId } from "@/lib/query-cache";
import { isDemo } from "@/services";

type SessionState =
  | { status: "loading" }
  | { status: "ready"; userId: string }
  | { status: "error"; reason: SessionError["reason"] }
  | { status: "not_configured" };

const SessionContext = React.createContext<{ state: SessionState; retry: () => void }>({ state: { status: "loading" }, retry: () => {} });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // Gespeicherte Sitzung → sofort starten (kein Ladebildschirm). Die Prüfung läuft im Hintergrund;
  // alle Datenabfragen warten ohnehin auf die gültige Sitzung.
  const [state, setState] = React.useState<SessionState>(() => {
    if (isDemo) return { status: "ready", userId: "demo" };
    if (!isSupabaseConfigured) return { status: "not_configured" };
    // Erstbesuch: ebenfalls sofort starten – die Willkommensseite braucht noch keine Sitzung.
    return { status: "ready", userId: storedUserId() ?? "" };
  });
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    if (isDemo || !isSupabaseConfigured) return;
    let cancelled = false;
    const optimistic = attempt === 0 && storedUserId() !== null; // gespeicherte Sitzung + Inhalte aus dem Zwischenspeicher
    if (attempt > 0) setState({ status: "loading" }); // nur bei „Erneut versuchen“ sichtbar warten
    ensureAnonymousSession()
      .then((s) => !cancelled && setState({ status: "ready", userId: s.user.id }))
      .catch((err) => {
        // Mit gespeicherter Sitzung (z. B. offline gestartet) die App nicht durch einen Fehlerbildschirm ersetzen –
        // Inhalte aus dem Zwischenspeicher bleiben sichtbar, Abfragen melden ihre Fehler selbst.
        if (cancelled || optimistic) return;
        setState({ status: "error", reason: err instanceof SessionError ? err.reason : "unknown" });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const value = React.useMemo(() => ({ state, retry: () => setAttempt((a) => a + 1) }), [state]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => React.useContext(SessionContext);

export function useOnlineStatus() {
  const [online, setOnline] = React.useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  React.useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}
