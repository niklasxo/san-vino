import { Outlet, ScrollRestoration, useLocation } from "react-router";
import { storedUserId } from "@/lib/query-cache";
import { FullScreenError, SplashScreen } from "@/components/layout/states";
import SetupPage from "@/pages/setup";
import { useSession } from "./session";

const SESSION_ERRORS = {
  offline: { title: "Keine Internetverbindung", text: "SAN VINO braucht für den Start kurz Internet. Prüf deine Verbindung." },
  anonymous_disabled: {
    title: "Anonyme Anmeldung ist deaktiviert",
    text: "Aktiviere in Supabase unter Authentication → Sign In / Providers die Option „Allow anonymous sign-ins“.",
  },
  unreachable: { title: "Supabase nicht erreichbar", text: "Der Server antwortet gerade nicht. Prüf die Projekt-URL oder versuch es gleich noch einmal." },
  unknown: { title: "Start fehlgeschlagen", text: "Beim Einrichten deiner Sitzung ist etwas schiefgelaufen." },
};

/** Wartet unsichtbar auf die anonyme Sitzung, bevor irgendetwas geladen wird. */
export function RootLayout() {
  const { state, retry } = useSession();
  const { pathname } = useLocation();
  if (state.status === "not_configured") return <SetupPage />;
  // Pages that need no session don't wait for it: the legal texts, and the welcome page on a first visit
  // (the session is set up in the background meanwhile; onboarding waits for it as before).
  const open = pathname === "/impressum" || pathname === "/datenschutz" || (pathname === "/willkommen" && !storedUserId());
  // Same tree as below, so the page isn't remounted once the session is ready.
  if (state.status === "loading" && open)
    return (
      <>
        <Outlet />
        <ScrollRestoration />
      </>
    );
  if (state.status === "loading") return <SplashScreen label="Wir bereiten alles für dich vor …" />;
  if (state.status === "error") {
    const e = SESSION_ERRORS[state.reason];
    return <FullScreenError title={e.title} text={e.text} onRetry={retry} />;
  }
  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  );
}
