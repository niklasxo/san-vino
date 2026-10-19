import { motion } from "motion/react";
import type { TasteType } from "@/lib/taste-profile/taste-type";
import { cn } from "@/lib/utils";

const EMBLEM: Record<TasteType["id"], string> = {
  fruity: "🍒",
  fresh: "🍋",
  elegant: "🕊️",
  bold: "🔥",
  sweet: "🍯",
  spicy: "🌶️",
};

/** Dunkle Premium-Karte mit dem persönlichen Geschmackstyp. */
export function TasteTypeCard({ type, className, children }: { type: TasteType; className?: string; children?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0.4, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={cn("grain relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-burgundy via-burgundy to-burgundy-deep p-6 text-ivory shadow-[var(--shadow-glow)]", className)}
    >
      <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-gold/20 blur-2xl" />
      <div className="pointer-events-none absolute right-5 bottom-5 size-24 rounded-full border border-gold/25" />
      <p className="text-[12px] font-semibold tracking-[0.2em] text-gold uppercase">Dein Geschmackstyp</p>
      <div className="mt-4 flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-ivory/10 text-[28px] ring-1 ring-gold/30" aria-hidden>
          {EMBLEM[type.id]}
        </span>
        <div>
          <h2 className="font-serif text-[26px] leading-tight">{type.name}</h2>
          <p className="mt-1 text-[14px] text-ivory/75">{type.tagline}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}
