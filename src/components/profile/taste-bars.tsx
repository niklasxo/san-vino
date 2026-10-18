import { motion } from "motion/react";
import type { UserTasteProfile } from "@shared/taste-types.ts";
import { LEVEL_LABEL, level, PROFILE_TRAITS } from "@/lib/taste-profile/describe";
import { cn } from "@/lib/utils";

/** Elegante horizontale Balken für das persönliche Geschmacksprofil. */
export function ProfileTasteBars({ profile, className, delay = 0 }: { profile: UserTasteProfile; className?: string; delay?: number }) {
  return (
    <ul className={cn("space-y-4", className)}>
      {PROFILE_TRAITS.map((t, i) => {
        const value = profile[t.key];
        const uncertain = (profile.certainty?.[t.key] ?? 1) < 0.4;
        return (
          <li key={t.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-[15px] text-charcoal">{t.label}</span>
              <span className="text-[13px] font-medium text-burgundy">
                {LEVEL_LABEL[level(value)]}
                {uncertain && <span className="ml-1.5 font-normal text-taupe">· geschätzt</span>}
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-cream-deep/70">
              <motion.div
                className={cn("absolute inset-y-0 left-0 rounded-full", uncertain ? "bg-gold/60" : "bg-gradient-to-r from-burgundy-soft to-burgundy")}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(4, value)}%` }}
                transition={{ duration: 0.9, delay: delay + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
