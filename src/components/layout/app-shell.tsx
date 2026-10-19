import { Navigate, Outlet } from "react-router";
import { useProfileState } from "@/hooks/queries";
import { FullScreenError, SplashScreen } from "@/components/layout/states";
import { BottomNav } from "./bottom-nav";

/** Hauptbereiche mit Bottom Navigation. Ohne abgeschlossenes Onboarding → Willkommen. */
export function AppShell() {
  const { data, isPending, error, refetch } = useProfileState();
  if (isPending) return <SplashScreen />;
  // Nur ohne (zwischengespeicherte) Daten blockieren – sonst bleibt die App bei Funklöchern benutzbar.
  if (error && !data) return <FullScreenError error={error} onRetry={() => refetch()} />;
  if (!data.onboardingCompleted) return <Navigate to="/willkommen" replace />;
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
}
