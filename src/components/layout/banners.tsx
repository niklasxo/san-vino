import { FlaskConical, WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useOnlineStatus } from "@/app/session";
import { disableDemoMode } from "@/lib/config";
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

export function DemoBanner() {
  if (!isDemo) return null;
  return (
    <div className="flex justify-center bg-gold/90 pt-safe text-burgundy-deep">
      <button
        onClick={() => {
          if (confirm("Demo-Modus beenden? Alle Demo-Daten werden verworfen.")) {
            try {
              sessionStorage.removeItem("vino-demo-store");
            } catch {
              /* ignorieren */
            }
            disableDemoMode();
          }
        }}
        className="flex h-7 items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase"
        title="Demo-Modus: Beispieldaten, nichts wird in Supabase gespeichert"
      >
        <FlaskConical className="size-3.5" /> Demo-Modus · Beispieldaten · beenden
      </button>
    </div>
  );
}
