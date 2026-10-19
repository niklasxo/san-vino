import { ChevronRight, Info, Search, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import * as React from "react";
import { Link } from "react-router";
import { Page, PageHeading, TopBar } from "@/components/layout/page";
import { WineGlyph } from "@/components/brand/wine-glyph";
import { SectionTitle } from "@/components/ui/card";
import { MatchPill } from "@/components/wine/match-ring";
import { useSwipes, useTasteProfile } from "@/hooks/queries";
import { shortReason } from "@/lib/matching";
import { SWIPE_QUESTIONS } from "@/lib/taste-profile/swipes";
import { recommendStyles, type StyleRecommendation } from "@/lib/wine-styles";

const TYPE_LABEL: Record<string, string> = { red: "Rotwein", white: "Weißwein", rose: "Rosé", sparkling: "Schaumwein", sweet: "Süßwein" };

const rise = (i: number) => ({
  initial: { opacity: 0.4, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.05 + i * 0.06, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
});

export default function MyWinePage() {
  const { profile } = useTasteProfile();
  const swipes = useSwipes();
  const ranked = React.useMemo(() => (profile ? recommendStyles(profile) : []), [profile]);
  if (!profile || ranked.length === 0) return null;

  const [best, ...rest] = ranked;
  const more = rest.slice(0, 5);
  const avoid = ranked.slice(-2).reverse();
  const answered = swipes.data ? Object.keys(swipes.data).length : 0;

  return (
    <Page>
      <TopBar />
      <PageHeading eyebrow="Dein Wein" title="Das passt am besten zu dir." subtitle="Ganz ohne Weinkarte – nur aus deinem persönlichen Geschmacksprofil." className="pt-2" />

      <motion.section {...rise(0)} className="grain relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-burgundy via-burgundy to-burgundy-deep p-6 text-ivory shadow-[var(--shadow-glow)]">
        <div className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-gold/15 blur-3xl" />
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.18em] text-gold uppercase">
            <Sparkles className="size-4" /> Dein Wein
          </p>
          <span className="rounded-full bg-ivory px-3 py-1.5 font-serif text-[20px] leading-none text-burgundy tabular-nums">{best.match.score} %</span>
        </div>
        <h2 className="mt-4 font-serif text-[32px] leading-tight">{best.style.name}</h2>
        <p className="mt-1 text-[14px] text-ivory/70">
          {TYPE_LABEL[best.style.type]} · {best.style.origin}
        </p>
        <p className="mt-4 font-serif text-[19px] leading-snug text-ivory/95 italic">„{best.style.description}“</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {best.style.notes.map((n) => (
            <span key={n} className="rounded-full bg-ivory/10 px-3 py-1 text-[13px] text-ivory/90 ring-1 ring-ivory/15">
              {n}
            </span>
          ))}
        </div>
        <p className="mt-5 flex gap-2 rounded-2xl bg-ivory/10 p-3 text-[14px] leading-snug text-ivory/90">
          <Search className="mt-0.5 size-4 shrink-0 text-gold" />
          <span>
            <span className="font-medium text-ivory">Auf der Karte suchen:</span> {best.style.lookFor}
          </span>
        </p>
      </motion.section>

      <motion.section {...rise(1)} className="mt-8">
        <SectionTitle title="Passt auch gut zu dir" />
        <div className="space-y-3">
          {more.map((r) => (
            <StyleRow key={r.style.id} rec={r} />
          ))}
        </div>
      </motion.section>

      <motion.section {...rise(2)} className="mt-8">
        <SectionTitle title="Eher nicht dein Ding" />
        <div className="space-y-3">
          {avoid.map((r) => (
            <StyleRow key={r.style.id} rec={r} muted />
          ))}
        </div>
      </motion.section>

      {answered < SWIPE_QUESTIONS.length && (
        <motion.div {...rise(3)}>
          <Link
            to="/geschmack/verfeinern"
            className="mt-8 flex items-center gap-4 rounded-[1.75rem] border border-gold/40 bg-gold/10 p-5 transition hover:bg-gold/15"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gold/25 text-burgundy">
              <Sparkles className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block text-[15px] font-medium text-charcoal">Noch genauer werden</span>
              <span className="block text-[13px] text-taupe">
                {answered === 0 ? "50 kurze Fragen zu deinem Alltagsgeschmack" : `${SWIPE_QUESTIONS.length - answered} Fragen offen`}
              </span>
            </span>
            <ChevronRight className="size-4 text-taupe" />
          </Link>
        </motion.div>
      )}

      <p className="mt-6 flex gap-2 px-1 text-[12px] leading-relaxed text-taupe">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Typische Weinstile, kein bestimmter Wein. Einzelne Weine können abweichen – berechnet vom SAN VINO-Algorithmus, ohne KI.
      </p>
    </Page>
  );
}

function StyleRow({ rec, muted }: { rec: StyleRecommendation; muted?: boolean }) {
  return (
    <div className={`rounded-[1.5rem] border border-line/60 bg-white/60 p-4 shadow-[var(--shadow-soft)] ${muted ? "opacity-80" : ""}`}>
      <div className="flex items-start gap-3">
        <WineGlyph type={rec.style.type} className="size-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-serif text-[18px] leading-snug text-charcoal">{rec.style.name}</p>
            <MatchPill match={rec.match} />
          </div>
          <p className="mt-0.5 text-[13px] text-taupe">
            {TYPE_LABEL[rec.style.type]} · {rec.style.origin}
          </p>
          <p className="mt-2 text-[14px] leading-snug text-charcoal/85">{shortReason(rec.match, rec.wine)}</p>
          {!muted && <p className="mt-1.5 text-[12px] text-taupe">Auf der Karte: {rec.style.lookFor}</p>}
        </div>
      </div>
    </div>
  );
}
