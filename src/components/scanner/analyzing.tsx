import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import type { ScanPhase } from "@/hooks/use-scan-workflow";

const TEXT: Partial<Record<ScanPhase, string>> = {
  uploading: "Dein Foto wird sicher hochgeladen …",
  analyzing: "Wir schauen uns deinen Wein an …",
  matching: "Wir vergleichen ihn mit deinem Geschmack …",
  done: "Wir vergleichen ihn mit deinem Geschmack …",
};

/** Erwartete Dauer bis zum Ergebnis – der Countdown zeigt sie als Zahl im Kreis. */
export const SCAN_TARGET_SECONDS = 15;

/**
 * Eleganter Countdown im Glas-Look: hauchdünner Goldring, der sich gleichmäßig leert,
 * große Serifenziffer, die weich wechselt.
 */
function Countdown({ seconds }: { seconds: number }) {
  const [left, setLeft] = React.useState(seconds);
  React.useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setLeft(Math.max(0, seconds - Math.floor((Date.now() - started) / 1000))), 200);
    return () => clearInterval(id);
  }, [seconds]);
  const r = 40;
  return (
    <div
      className="relative grid size-[96px] place-items-center rounded-full bg-ivory/75 shadow-[0_10px_30px_-12px_rgba(53,21,34,0.45),inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-white/70 backdrop-blur-xl"
      aria-label={left > 0 ? `Noch etwa ${left} Sekunden` : "Gleich fertig"}
    >
      <svg viewBox="0 0 96 96" className="absolute inset-0 size-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="countdown-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-gold)" />
            <stop offset="100%" stopColor="var(--color-burgundy-soft)" />
          </linearGradient>
        </defs>
        <circle cx="48" cy="48" r={r} fill="none" strokeWidth="1.5" stroke="var(--color-gold-soft)" opacity="0.6" />
        <motion.circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          stroke="url(#countdown-ring)"
          initial={{ pathLength: 1, opacity: 1 }}
          animate={{ pathLength: 0, opacity: [1, 1, 0] }}
          transition={{ duration: seconds, ease: "linear", opacity: { duration: seconds, times: [0, 0.97, 1] } }}
        />
        {left === 0 && (
          <motion.circle
            cx="48"
            cy="48"
            r={r}
            fill="none"
            strokeWidth="2"
            stroke="var(--color-gold)"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </svg>
      <div className="relative flex flex-col items-center leading-none">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={left}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="font-serif text-[34px] tabular-nums text-burgundy"
          >
            {left > 0 ? left : "·"}
          </motion.span>
        </AnimatePresence>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-taupe">{left > 0 ? "Sek." : "gleich"}</span>
      </div>
    </div>
  );
}

export function AnalyzingView({ previews, phase, slow, isMenu }: { previews: string[]; phase: ScanPhase; slow: boolean; isMenu: boolean }) {
  return (
    <div className="flex flex-col items-center pt-8 text-center" role="status" aria-live="polite">
      <div className="relative w-[78%] max-w-[300px]">
        {previews.slice(1, 3).map((src, i) => (
          <img key={src} src={src} alt="" className="absolute inset-0 h-full w-full rounded-[1.75rem] object-cover opacity-60 shadow-[var(--shadow-soft)]" style={{ transform: `rotate(${(i + 1) * 4}deg) translateX(${(i + 1) * 10}px)` }} />
        ))}
        <div className="relative aspect-[3/4] overflow-hidden rounded-[1.75rem] bg-cream shadow-[var(--shadow-lift)]">
          {previews[0] && <img src={previews[0]} alt="Dein Foto" className="h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-b from-burgundy-deep/10 via-transparent to-burgundy-deep/40" />
          <motion.div
            className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-gold/35 to-transparent"
            animate={{ top: ["-20%", "100%"] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }}
          />
          <motion.div className="absolute inset-x-6 h-px bg-gold shadow-[0_0_16px_2px_rgba(198,168,120,0.8)]" animate={{ top: ["8%", "92%"] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }} />
          {["top-4 left-4 border-t border-l", "top-4 right-4 border-t border-r", "bottom-4 left-4 border-b border-l", "bottom-4 right-4 border-b border-r"].map((c) => (
            <span key={c} className={`absolute size-7 rounded-[6px] border-ivory/90 ${c}`} />
          ))}
        </div>
      </div>
      <div className="relative z-10 -mt-12">
        <Countdown seconds={SCAN_TARGET_SECONDS} />
      </div>
      <div className="mt-5 h-16">
        <AnimatePresence mode="wait">
          <motion.p
            key={phase}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="font-serif text-[23px] leading-snug text-charcoal"
          >
            {TEXT[phase]}
          </motion.p>
        </AnimatePresence>
        {slow && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-[14px] text-taupe">
            {isMenu ? "Weinkarten sind viel Text – gleich geschafft." : "Das dauert gerade etwas länger als sonst …"}
          </motion.p>
        )}
      </div>
    </div>
  );
}
