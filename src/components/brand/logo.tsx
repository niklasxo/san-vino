import { cn } from "@/lib/utils";

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-serif text-[22px] font-semibold tracking-[0.18em]", light ? "text-ivory" : "text-burgundy", className)}>
      <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
        <path d="M6 3h12c0 5.2-2.4 8.6-6 9-3.6-.4-6-3.8-6-9Z" fill="currentColor" />
        <path d="M12 12v7m-3.5 2h7" stroke="var(--color-gold)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
      VINO
    </span>
  );
}
