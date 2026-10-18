import { ChevronRight, Heart, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router";
import type { MatchResult } from "@/lib/matching";
import { shortReason } from "@/lib/matching";
import { WineGlyph } from "@/components/brand/wine-glyph";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExtractedWine } from "@/types/domain";
import { MatchPill } from "./match-ring";
import { priceLabel } from "./price";
import { wineSubtitle, wineTitle } from "./wine-meta";

const appear = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.08 + i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
});

/** Listenkarte für erkannte und gespeicherte Weine. */
export function WineListCard({
  wine,
  match,
  to,
  index = 0,
  rank,
  reason,
  favorite,
  extra,
}: {
  wine: ExtractedWine;
  match: MatchResult | null;
  to: string;
  index?: number;
  rank?: number;
  reason?: string | null;
  favorite?: boolean;
  extra?: React.ReactNode;
}) {
  const price = priceLabel(wine);
  return (
    <motion.li {...appear(index)} className="list-none">
      <Link
        to={to}
        className="group flex items-center gap-3.5 rounded-[1.5rem] border border-line/60 bg-white/60 p-3.5 pr-3 shadow-[var(--shadow-soft)] transition hover:bg-white active:scale-[0.99]"
      >
        <div className="relative">
          <WineGlyph type={wine.wine_type} />
          {rank != null && (
            <span className="absolute -top-1.5 -left-1.5 grid size-5 place-items-center rounded-full bg-charcoal text-[11px] font-semibold text-ivory">{rank}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-serif text-[17px] leading-snug text-charcoal">{wineTitle(wine)}</p>
            {favorite && <Heart className="size-3.5 shrink-0 fill-burgundy text-burgundy" aria-label="Favorit" />}
          </div>
          <p className="truncate text-[13px] text-taupe">{[wine.producer, wineSubtitle(wine)].filter(Boolean).join(" · ")}</p>
          {(reason ?? (match ? shortReason(match, wine) : null)) && (
            <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-charcoal/80">{reason ?? (match ? shortReason(match, wine) : "")}</p>
          )}
          {(price || extra) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px]">
              {price && (
                <span className={cn("font-medium text-charcoal", price.uncertain && "text-taupe")}>
                  {price.text}
                  {price.uncertain && " · Zuordnung unsicher"}
                </span>
              )}
              {extra}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {match && <MatchPill match={match} />}
          <ChevronRight className="size-4 text-taupe/70 transition group-hover:translate-x-0.5" />
        </div>
      </Link>
    </motion.li>
  );
}

/** Hervorgehobene Karte für den besten Treffer einer Weinkarte. */
export function FavoriteCard({ wine, match, to, reason }: { wine: ExtractedWine; match: MatchResult; to: string; reason: string }) {
  const price = priceLabel(wine);
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="grain relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-burgundy to-burgundy-deep p-6 text-ivory shadow-[var(--shadow-glow)]"
    >
      <div className="pointer-events-none absolute -top-20 -right-10 size-56 rounded-full bg-gold/20 blur-3xl" />
      <div className="flex items-start justify-between gap-4">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold tracking-[0.2em] text-gold uppercase">
          <Sparkles className="size-3.5" /> Dein Favorit
        </p>
        <span className="rounded-full bg-ivory px-3 py-1.5 font-serif text-[20px] leading-none text-burgundy tabular-nums">
          {match.confidence === "low" && "≈"}
          {match.score}
          <span className="text-[13px]"> %</span>
        </span>
      </div>
      <h2 className="mt-4 font-serif text-[28px] leading-[1.12]">{wineTitle(wine)}</h2>
      <p className="mt-1 text-[14px] text-ivory/70">{[wine.producer, wineSubtitle(wine)].filter(Boolean).join(" · ")}</p>
      <p className="mt-4 font-serif text-[18px] leading-snug text-ivory/95 italic">„{reason}“</p>
      {price && (
        <p className="mt-3 text-[14px] text-ivory/80">
          Preis: <span className="font-medium text-ivory">{price.text}</span>
          {price.uncertain && " (Zuordnung unsicher)"}
        </p>
      )}
      <Button asChild variant="light" size="md" className="mt-6">
        <Link to={to}>Warum passt der zu mir?</Link>
      </Button>
    </motion.div>
  );
}
