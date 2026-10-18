import { motion } from "motion/react";
import type { WineDimension, WineProperty } from "@shared/taste-types.ts";
import type { ExtractedWine } from "@shared/wine-schema.ts";
import { LEVEL_LABEL, level } from "@/lib/taste-profile/describe";
import { cn } from "@/lib/utils";

const SHOWN: { d: WineDimension; label: string }[] = [
  { d: "fruitiness", label: "Fruchtig" },
  { d: "sweetness", label: "Süße" },
  { d: "body", label: "Kräftig" },
  { d: "acidity", label: "Säure & Frische" },
  { d: "tannins", label: "Herbe (Tannine)" },
  { d: "spice", label: "Würze" },
];

function display(d: WineDimension, label: string, p: WineProperty) {
  // Bei wenig Süße ist „Trocken“ die verständlichere Beschreibung.
  if (d === "sweetness" && p.value! < 45) return { label: "Trocken", value: 100 - p.value! };
  return { label, value: p.value! };
}

/** Typische Geschmackseigenschaften des Weins – mit Kennzeichnung geschätzter Werte. */
export function WineTasteBars({ wine, className }: { wine: ExtractedWine; className?: string }) {
  const rows = SHOWN.map((s) => ({ ...s, p: wine.taste_properties[s.d] })).filter((r) => r.p.value != null);
  if (rows.length === 0) {
    return <p className="text-[14px] text-taupe">Zu diesem Wein haben wir noch keine verlässlichen Geschmacksangaben.</p>;
  }
  return (
    <div className={className}>
      <ul className="space-y-4">
        {rows.map(({ d, label, p }, i) => {
          const v = display(d, label, p);
          return (
            <li key={d}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-[15px] text-charcoal">{v.label}</span>
                <span className="text-[13px] font-medium text-burgundy">
                  {LEVEL_LABEL[level(v.value)]}
                  {p.source === "style_estimate" && <span className="ml-1.5 font-normal text-taupe">· grob geschätzt</span>}
                </span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-cream-deep/70">
                <motion.div
                  className={cn("absolute inset-y-0 left-0 rounded-full", p.source === "style_estimate" ? "bg-gold/55" : "bg-gradient-to-r from-gold to-[#a8875a]")}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(4, v.value)}%` }}
                  transition={{ duration: 0.9, delay: 0.15 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[12px] leading-relaxed text-taupe">Typische Eigenschaften dieses Weinstils – keine Verkostungsnotiz dieser Flasche.</p>
    </div>
  );
}
