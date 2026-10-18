import { cn } from "@/lib/utils";

/** Wortmarke „SAN VINO“ mit kleiner Flasche. */
export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-serif text-[21px] font-semibold tracking-[0.16em]", light ? "text-ivory" : "text-burgundy", className)}>
      <svg viewBox="0 0 24 24" className="size-[19px]" aria-hidden>
        <path d="M10 2.5h4v4.2c0 .9.5 1.6 1.2 2.2 1 .8 1.6 2 1.6 3.3V20a1.5 1.5 0 0 1-1.5 1.5H8.7A1.5 1.5 0 0 1 7.2 20v-7.8c0-1.3.6-2.5 1.6-3.3.7-.6 1.2-1.3 1.2-2.2Z" fill="currentColor" />
        <rect x="8.4" y="13" width="7.2" height="4.4" rx="0.8" fill="var(--color-gold)" />
      </svg>
      <span>
        <span className="mr-[0.32em] text-[0.72em] tracking-[0.22em] text-gold">SAN</span>VINO
      </span>
    </span>
  );
}
