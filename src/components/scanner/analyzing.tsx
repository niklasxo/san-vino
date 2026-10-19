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

function Countdown({ seconds }: { seconds: number }) {
  const [left, setLeft] = React.useState(seconds);
  React.useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setLeft(Math.max(0, seconds - Math.floor((Date.now() - started) / 1000))), 250);
    return () => clearInterval(id);
  }, [seconds]);
  const r = 26;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="relative size-16" aria-label={left > 0 ? `Noch etwa ${left} Sekunden` : "Gleich fertig"}>
      <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="5" className="stroke-current text-cream" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          className="stroke-current text-burgundy transition-[stroke-dashoffset] duration-300 ease-linear"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - left / seconds)}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-serif text-[22px] tabular-nums text-charcoal">
        {left > 0 ? left : "…"}
      </span>
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
      <div className="mt-7">
        <Countdown seconds={SCAN_TARGET_SECONDS} />
      </div>
      <div className="mt-4 h-16">
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
