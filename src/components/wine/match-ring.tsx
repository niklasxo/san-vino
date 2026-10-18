import { animate, motion, useReducedMotion } from "motion/react";
import * as React from "react";
import { MATCH_CATEGORY_LABEL, matchCategory, type MatchCategory, type MatchResult } from "@/lib/matching";
import { cn } from "@/lib/utils";

export const CATEGORY_COLOR: Record<MatchCategory, string> = {
  excellent: "#531f32",
  good: "#7a3a50",
  maybe: "#c6a878",
  unlikely: "#a79c95",
  uncertain: "#c9bfb5",
};

/** Kurztext unter dem Score – persönlich formuliert. */
export const CATEGORY_SHORT: Record<MatchCategory, string> = {
  excellent: "Sehr wahrscheinlich dein Geschmack",
  good: "Könnte dir richtig gut schmecken",
  maybe: "Vielleicht etwas für dich",
  unlikely: "Wahrscheinlich weniger dein Geschmack",
  uncertain: "Einschätzung noch unsicher",
};

function useCountUp(target: number, enabled: boolean) {
  const reduce = useReducedMotion();
  const [value, setValue] = React.useState(enabled && !reduce ? 0 : target);
  React.useEffect(() => {
    if (!enabled || reduce) return setValue(target);
    const controls = animate(0, target, { duration: 1.2, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setValue(Math.round(v)) });
    return () => controls.stop();
  }, [target, enabled, reduce]);
  return value;
}

export function MatchRing({ match, size = 168, className }: { match: Pick<MatchResult, "score" | "confidence">; size?: number; className?: string }) {
  const category = matchCategory(match);
  const uncertain = category === "uncertain";
  const value = useCountUp(match.score, !uncertain);
  const stroke = Math.max(6, size * 0.055);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = CATEGORY_COLOR[category];
  const approx = match.confidence === "low";

  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-cream-deep)" strokeWidth={stroke} strokeDasharray={uncertain ? "3 7" : undefined} />
        {!uncertain && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - match.score / 100) }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {uncertain ? (
          <>
            <span className="font-serif text-[40px] leading-none text-taupe" style={{ fontSize: size * 0.24 }}>
              ?
            </span>
            <span className="mt-1 text-[12px] font-medium tracking-wide text-taupe uppercase">unsicher</span>
          </>
        ) : (
          <>
            <span className="font-serif leading-none text-charcoal tabular-nums" style={{ fontSize: size * 0.26 }}>
              {approx && <span className="mr-0.5 text-taupe">≈</span>}
              {value}
              <span className="text-[0.5em] text-taupe">%</span>
            </span>
            <span className="mt-1.5 text-[12px] font-semibold tracking-[0.16em] text-gold uppercase">Match</span>
          </>
        )}
      </div>
      <span className="sr-only">
        {uncertain ? MATCH_CATEGORY_LABEL.uncertain : `${match.score} Prozent geschätzte persönliche Passung – ${MATCH_CATEGORY_LABEL[category]}`}
      </span>
    </div>
  );
}

/** Kompakte Score-Anzeige für Listen. */
export function MatchPill({ match, className, large }: { match: Pick<MatchResult, "score" | "confidence">; className?: string; large?: boolean }) {
  const category = matchCategory(match);
  if (category === "uncertain") {
    return (
      <span className={cn("inline-flex items-center rounded-full border border-dashed border-line px-2.5 py-1 text-[12px] font-medium text-taupe", className)}>
        unsicher
      </span>
    );
  }
  const strong = category === "excellent" || category === "good";
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-0.5 rounded-full px-2.5 py-1 font-semibold tabular-nums",
        large ? "text-[17px]" : "text-[13px]",
        strong ? "bg-burgundy text-ivory" : category === "maybe" ? "bg-gold/25 text-burgundy-deep" : "bg-cream text-taupe",
        className,
      )}
      aria-label={`${match.score} Prozent Match`}
    >
      {match.confidence === "low" && "≈"}
      {match.score}
      <span className="text-[0.75em] font-medium opacity-75">%</span>
    </span>
  );
}
