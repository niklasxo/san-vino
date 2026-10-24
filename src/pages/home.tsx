import { Camera, ChevronRight, Heart, Lightbulb, ScanLine, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router";
import { Logo } from "@/components/brand/logo";
import { WineGlyph } from "@/components/brand/wine-glyph";
import { Page } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchPill } from "@/components/wine/match-ring";
import { WineListCard } from "@/components/wine/wine-card";
import { wineTitle } from "@/components/wine/wine-meta";
import { useProfileState, useRecentScans, useSavedWines } from "@/hooks/queries";
import { computeMatch } from "@/lib/matching";
import { homeTagline, LEVEL_LABEL, level } from "@/lib/taste-profile/describe";
import { determineTasteType } from "@/lib/taste-profile/taste-type";
import { tipFor } from "@/lib/taste-profile/tips";
import { formatRelativeDate } from "@/lib/utils";

const rise = (i: number) => ({
  initial: { opacity: 0.4, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.05 + i * 0.07, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
});

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Guten Morgen";
  if (h < 17) return "Schön, dass du da bist";
  return "Guten Abend";
}

export default function HomePage() {
  const navigate = useNavigate();
  const { data: state } = useProfileState();
  const recent = useRecentScans(6);
  const saved = useSavedWines();
  if (!state?.taste) return null; // Profil gerade gelöscht – AppShell leitet zum Willkommen weiter
  const profile = state.taste.learned;
  const type = determineTasteType(profile);
  const favorites = (saved.data ?? []).filter((w) => w.is_favorite).slice(0, 3);
  const tip = tipFor(type.id);

  return (
    <Page>
      <motion.header {...rise(0)} className="flex items-center justify-between pt-5">
        <Logo />
        <span className="text-[13px] text-taupe">{greeting()}</span>
      </motion.header>

      <motion.div {...rise(1)} className="pt-8 pb-7">
        <h1 className="text-balance font-serif text-[36px] leading-[1.08] text-charcoal">Welcher Wein passt heute zu dir?</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-taupe">{homeTagline(profile)}</p>
      </motion.div>

      {/* Hauptaktion */}
      <motion.section {...rise(2)} className="grain relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-burgundy via-burgundy to-burgundy-deep p-6 text-ivory shadow-[var(--shadow-glow)]">
        <div className="pointer-events-none absolute -right-14 -bottom-20 size-64 rounded-full border border-gold/20" />
        <div className="pointer-events-none absolute -right-4 -bottom-10 size-40 rounded-full border border-gold/15" />
        <div className="pointer-events-none absolute -top-16 -left-10 size-48 rounded-full bg-gold/15 blur-3xl" />
        <span className="grid size-14 place-items-center rounded-2xl bg-ivory/10 text-gold ring-1 ring-gold/30">
          <Camera className="size-6" />
        </span>
        <h2 className="mt-5 font-serif text-[28px] leading-tight">Wein scannen</h2>
        <p className="mt-1.5 max-w-[16rem] text-[15px] leading-relaxed text-ivory/75">Fotografiere eine Flasche oder eine Weinkarte.</p>
        <Button variant="light" className="mt-6" onClick={() => navigate("/scannen")}>
          <ScanLine /> Jetzt scannen
        </Button>
      </motion.section>

      {/* Mein Wein – Empfehlung ohne Karte */}
      <motion.div {...rise(3)}>
        <Link
          to="/geschmack/mein-wein"
          className="group mt-4 flex items-center gap-4 rounded-[1.75rem] border border-gold/40 bg-gold/10 p-5 transition hover:bg-gold/15 active:scale-[0.99]"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gold/25 text-burgundy">
            <Sparkles className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block text-[16px] font-medium text-charcoal">Welcher Wein passt zu mir?</span>
            <span className="block text-[13px] text-taupe">Dein Wein – ganz ohne Weinkarte</span>
          </span>
          <ChevronRight className="size-5 text-taupe transition group-hover:translate-x-0.5" />
        </Link>
      </motion.div>

      {/* Geschmack */}
      <motion.section {...rise(3)} className="mt-8">
        <SectionTitle title="Dein persönlicher Geschmack" />
        <Link to="/geschmack" className="group block rounded-[1.75rem] border border-line/60 bg-white/60 p-5 shadow-[var(--shadow-soft)] transition hover:bg-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-serif text-[20px] text-charcoal">{type.name}</p>
              <p className="mt-0.5 text-[14px] text-taupe">{type.tagline}</p>
            </div>
            <ChevronRight className="size-5 text-taupe transition group-hover:translate-x-0.5" />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {(
              [
                ["Fruchtig", profile.fruitiness_preference],
                ["Süße", profile.sweetness_preference],
                ["Kräftig", profile.intensity_preference],
              ] as const
            ).map(([label, v]) => (
              <div key={label}>
                <div className="h-1.5 overflow-hidden rounded-full bg-cream-deep/70">
                  <motion.div className="h-full rounded-full bg-burgundy" initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 0.9, delay: 0.4 }} />
                </div>
                <p className="mt-1.5 text-[12px] text-taupe">
                  {label} · <span className="text-charcoal">{LEVEL_LABEL[level(v)]}</span>
                </p>
              </div>
            ))}
          </div>
        </Link>
      </motion.section>

      {/* Zuletzt gescannt */}
      <motion.section {...rise(4)} className="mt-8">
        <SectionTitle title="Zuletzt gescannt" />
        {recent.isPending ? (
          <div className="flex gap-3">
            <Skeleton className="h-36 w-44 shrink-0" />
            <Skeleton className="h-36 w-44 shrink-0" />
          </div>
        ) : recent.data && recent.data.length > 0 ? (
          <div className="no-scrollbar -mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2">
            {recent.data.map((scan) => {
              const top = scan.top_item;
              const m = top ? computeMatch(profile, top.extracted_data) : null;
              return (
                <Link
                  key={scan.id}
                  to={scan.scan_type === "bottle" && scan.item_count === 1 && top ? `/scan/${scan.id}/wein/${top.id}` : `/scan/${scan.id}`}
                  className="flex w-44 shrink-0 snap-start flex-col rounded-[1.5rem] border border-line/60 bg-white/60 p-4 shadow-[var(--shadow-soft)] transition hover:bg-white active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between">
                    <WineGlyph type={top?.extracted_data.wine_type ?? "unknown"} className="size-10" />
                    {m && <MatchPill match={m} />}
                  </div>
                  <p className="mt-3 line-clamp-2 font-serif text-[16px] leading-snug text-charcoal">{top ? wineTitle(top.extracted_data) : "Scan"}</p>
                  <p className="mt-auto pt-2 text-[12px] text-taupe">
                    {scan.scan_type === "menu" ? `Weinkarte · ${scan.item_count} Weine` : "Flasche"} · {formatRelativeDate(scan.created_at)}
                  </p>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="rounded-[1.5rem] border border-dashed border-line px-5 py-6 text-center text-[14px] text-taupe">Hier erscheinen deine Scans. Fang am besten mit der nächsten Flasche an.</p>
        )}
      </motion.section>

      {/* Lieblingsweine */}
      <motion.section {...rise(5)} className="mt-8">
        <SectionTitle
          title="Deine Lieblingsweine"
          action={
            favorites.length > 0 && (
              <Link to="/weine?filter=favoriten" className="text-[14px] font-medium text-burgundy">
                Alle
              </Link>
            )
          }
        />
        {favorites.length > 0 ? (
          <ul className="space-y-3">
            {favorites.map((w, i) => (
              <WineListCard key={w.id} index={i} wine={w.wine_snapshot} match={computeMatch(profile, w.wine_snapshot)} to={`/weine/${w.id}`} favorite />
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-3 rounded-[1.5rem] border border-dashed border-line px-5 py-5 text-[14px] text-taupe">
            <Heart className="size-5 shrink-0 text-gold" /> Markiere Weine, die du liebst, mit dem Herz – dann findest du sie hier.
          </p>
        )}
      </motion.section>

      {/* Tipp */}
      <motion.section {...rise(6)} className="mt-8 rounded-[1.75rem] bg-cream/80 p-5">
        <p className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.18em] text-gold-ink uppercase">
          <Lightbulb className="size-4" /> Kleiner Tipp für dich
        </p>
        <p className="mt-3 font-serif text-[20px] text-charcoal">{tip.title}</p>
        <p className="mt-1 text-[15px] leading-relaxed text-taupe">{tip.text}</p>
      </motion.section>
    </Page>
  );
}
