import { motion } from "motion/react";

export function OnboardingProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-charcoal">
          Frage {current} von {total}
        </span>
        <span className="text-taupe">{Math.round((current / total) * 100)} %</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-cream" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current}>
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-burgundy to-burgundy-soft"
          initial={false}
          animate={{ width: `${(current / total) * 100}%` }}
          transition={{ type: "spring", stiffness: 140, damping: 24 }}
        />
      </div>
    </div>
  );
}
