import { FlaskConical, WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useOnlineStatus } from "@/app/session";
import { disableDemoMode, usesHashRouter } from "@/lib/config";
import { isDemo } from "@/services";

export function OfflineBanner() {
  const online = useOnlineStatus();
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed inset-x-0 top-0 z-[60] flex justify-center pt-safe"
          role="status"
        >
          <div className="mt-2 flex items-center gap-2 rounded-full bg-charcoal px-4 py-2 text-[13px] text-ivory shadow-[var(--shadow-lift)]">
            <WifiOff className="size-4" /> Du bist offline – einiges geht gerade nicht.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Goldener Balken im Demo-Modus. Beenden/Zurücksetzen mit zweitem Tippen (kein Browser-Dialog). */
export function DemoBanner() {
  const [armed, setArmed] = React.useState(false);
  React.useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(t);
  }, [armed]);
  if (!isDemo) return null;

  const action = usesHashRouter ? "zurücksetzen" : "beenden";
  return (
    <div className="flex justify-center bg-gold/90 pt-safe text-burgundy-deep">
      <button
        onClick={() => {
          if (!armed) return setArmed(true);
          try {
            sessionStorage.removeItem("vino-demo-store");
          } catch {
            /* ignorieren */
          }
          disableDemoMode();
        }}
        className="flex h-7 items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase"
        title="Demo-Modus: Beispieldaten, nichts wird in Supabase gespeichert"
      >
        <FlaskConical className="size-3.5" />
        {armed ? `Nochmal tippen zum ${action === "beenden" ? "Beenden" : "Zurücksetzen"}` : `Demo-Modus · Beispieldaten · ${action}`}
      </button>
    </div>
  );
}
