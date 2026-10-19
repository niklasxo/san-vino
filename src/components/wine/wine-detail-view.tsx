import { motion } from "motion/react";
import * as React from "react";
import { WineGlyph } from "@/components/brand/wine-glyph";
import { MATCH_CATEGORY_LABEL, matchCategory, type MatchResult } from "@/lib/matching";
import { WINE_TYPE_LABEL } from "@/lib/taste-profile/describe";
import type { ExtractedWine } from "@/types/domain";
import { IdentificationLine, IdentificationNotice } from "./identification-notice";
import { CATEGORY_SHORT, MatchRing } from "./match-ring";
import { priceLabel } from "./price";
import { WineFacts, wineTitle } from "./wine-meta";
import { WineTasteBars } from "./wine-taste-bars";

const section = (i: number) => ({
  initial: { opacity: 0.4, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.15 + i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
});

/** Gemeinsame, hochwertige Detailansicht für gescannte und gespeicherte Weine. */
export function WineDetailView({
  wine,
  match,
  headline,
  explanation,
  onEdit,
  badges,
  price,
}: {
  wine: ExtractedWine;
  match: MatchResult | null;
  headline?: string;
  explanation: React.ReactNode;
  onEdit?: () => void;
  badges?: React.ReactNode;
  price?: { value: number | null; currency: string | null };
}) {
  const category = match ? matchCategory(match) : null;
  const priceText = priceLabel(wine, price?.value ?? wine.price, price?.currency ?? wine.currency);
  const sub = [wine.producer, [wine.region, wine.country].filter(Boolean).join(", "), wine.vintage, wine.grape_varieties.join(", ")].filter(Boolean);

  return (
    <div>
      <motion.div {...section(0)} className="pt-2 text-center">
        {headline && <p className="text-[12px] font-semibold tracking-[0.2em] text-gold uppercase">{headline}</p>}
        <div className="mt-4 flex justify-center">
          <WineGlyph type={wine.wine_type} className="size-14" />
        </div>
        <h1 className="mt-4 text-balance font-serif text-[32px] leading-[1.1] text-charcoal">{wineTitle(wine)}</h1>
        <p className="mt-2 text-[15px] text-taupe">{WINE_TYPE_LABEL[wine.wine_type]}</p>
        {sub.length > 0 && <p className="mx-auto mt-1 max-w-sm text-[14px] leading-relaxed text-taupe">{sub.join(" · ")}</p>}
        {priceText && (
          <p className="mt-2 text-[14px] font-medium text-charcoal">
            {priceText.text}
            {priceText.uncertain && <span className="font-normal text-taupe"> · Preiszuordnung unsicher</span>}
          </p>
        )}
        {badges && <div className="mt-3 flex flex-wrap justify-center gap-2">{badges}</div>}
      </motion.div>

      {match && category && (
        <motion.section {...section(1)} className="mt-8 flex flex-col items-center rounded-[2rem] bg-cream/70 px-6 py-7 text-center">
          <MatchRing match={match} />
          <p className="mt-4 font-serif text-[21px] leading-snug text-charcoal">{CATEGORY_SHORT[category]}</p>
          <p className="mt-1 text-[13px] text-taupe">
            {category === "uncertain"
              ? "Uns fehlen zu viele Angaben über diesen Wein – lieber ehrlich als geraten."
              : `Geschätzte persönliche Passung · ${MATCH_CATEGORY_LABEL[category]}`}
          </p>
        </motion.section>
      )}

      <motion.div {...section(2)} className="mt-5">
        <IdentificationNotice wine={wine} onEdit={onEdit} />
      </motion.div>

      <motion.section {...section(3)} className="mt-6 rounded-[1.75rem] border border-line/60 bg-white/60 p-5">
        {explanation}
      </motion.section>

      <motion.section {...section(4)} className="mt-6 rounded-[1.75rem] bg-cream/70 p-5">
        <h2 className="mb-5 font-serif text-[20px] text-charcoal">Geschmack</h2>
        <WineTasteBars wine={wine} />
        {wine.typical_notes.length > 0 && (
          <p className="mt-4 text-[14px] text-charcoal">
            <span className="text-taupe">Typische Aromen: </span>
            {wine.typical_notes.join(", ")}
          </p>
        )}
      </motion.section>

      <motion.section {...section(5)} className="mt-6">
        <WineFacts wine={wine} />
        <div className="mt-4">
          <IdentificationLine wine={wine} />
        </div>
      </motion.section>
    </div>
  );
}
