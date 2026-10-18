import { motion } from "motion/react";
import * as React from "react";
import { cn } from "@/lib/utils";

/** Auswählbarer Filter-/Grund-Chip. */
export function Chip({
  selected,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[14px] font-medium transition-colors duration-200 active:scale-[0.97]",
        selected ? "border-burgundy bg-burgundy text-ivory" : "border-line bg-white/50 text-charcoal hover:bg-cream",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Segment-Leiste mit gleitender Markierung. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  layoutId,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  layoutId: string;
}) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative h-10 shrink-0 rounded-full px-4 text-[14px] font-medium transition-colors",
              active ? "text-ivory" : "text-charcoal/80 hover:text-charcoal",
            )}
          >
            {active && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-full bg-burgundy" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            {!active && <span className="absolute inset-0 rounded-full border border-line bg-white/40" />}
            <span className="relative">
              {o.label}
              {o.count != null && <span className={cn("ml-1.5 text-[12px]", active ? "text-ivory/70" : "text-taupe")}>{o.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
