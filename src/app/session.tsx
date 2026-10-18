import * as React from "react";
import { ensureAnonymousSession, SessionError } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { isDemo } from "@/services";

type SessionState =
  | { status: "loading" }
  | { status: "ready"; userId: string }
  | { status: "error"; reason: SessionError["reason"] }
  | { status: "not_configured" };

const SessionContext = React.createContext<{ state: SessionState; retry: () => void }>({ state: { status: "loading" }, retry: () => {} });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<SessionState>(() =>
    isDemo ? { status: "ready", userId: "demo" } : isSupabaseConfigured ? { status: "loading" } : { status: "not_configured" },
  );
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    if (isDemo || !isSupabaseConfigured) return;
    let cancelled = false;
    setState({ status: "loading" });
    ensureAnonymousSession()
      .then((s) => !cancelled && setState({ status: "ready", userId: s.user.id }))
      .catch((err) => !cancelled && setState({ status: "error", reason: err instanceof SessionError ? err.reason : "unknown" }));
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
