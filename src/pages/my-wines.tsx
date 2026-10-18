import { Search, Wine as WineIcon, X } from "lucide-react";
import * as React from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Page, PageHeading } from "@/components/layout/page";
import { EmptyState, InlineError } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { WineListCard } from "@/components/wine/wine-card";
import { wineTitle } from "@/components/wine/wine-meta";
import { useRecentScans, useSavedWines, useTasteProfile } from "@/hooks/queries";
import { computeMatch } from "@/lib/matching";
import { VERDICT_LABEL } from "@/lib/taste-profile/learning";
import { formatRelativeDate } from "@/lib/utils";
import type { SavedWine } from "@/types/domain";

type Filter = "alle" | "favoriten" | "probiert" | "offen";
const FILTERS: { value: Filter; label: string; test: (w: SavedWine) => boolean }[] = [
  { value: "alle", label: "Alle", test: () => true },
  { value: "favoriten", label: "Favoriten", test: (w) => w.is_favorite },
  { value: "probiert", label: "Probiert", test: (w) => w.has_tried || Boolean(w.rating) },
  { value: "offen", label: "Noch nicht probiert", test: (w) => !w.has_tried && !w.rating },
];

const normalize = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

export default function MyWinesPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filter = (FILTERS.some((f) => f.value === params.get("filter")) ? params.get("filter") : "alle") as Filter;
  const [query, setQuery] = React.useState("");
  const saved = useSavedWines();
  const scans = useRecentScans(20);
  const { profile } = useTasteProfile();

  const list = saved.data ?? [];
  const active = FILTERS.find((f) => f.value === filter)!;
  const q = normalize(query.trim());
  const visible = list
    .filter(active.test)
    .filter((w) => !q || normalize([wineTitle(w.wine_snapshot), w.wine_snapshot.producer, ...w.wine_snapshot.grape_varieties].filter(Boolean).join(" ")).includes(q));

  return (
    <Page>
      <PageHeading eyebrow="Meine Weine" title="Deine Weinsammlung" subtitle="Gespeichert, probiert und geliebt – alles an einem Ort." />

      {saved.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-11 w-full rounded-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : saved.error ? (
        <InlineError error={saved.error} onRetry={() => saved.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<WineIcon />}
          title="Noch keine Weine gespeichert"
          text="Scanne eine Flasche oder eine Weinkarte und speichere die Weine, die dich interessieren."
          action={<Button size="md" onClick={() => navigate("/scannen")}>Ersten Wein scannen</Button>}
        />
      ) : (
        <>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-taupe" />
            <Input type="search" placeholder="Nach Weinname suchen" value={query} onChange={(e) => setQuery(e.target.value)} className="rounded-full pl-11" aria-label="Weine durchsuchen" />
            {query && (
              <button onClick={() => setQuery("")} className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-full text-taupe hover:bg-cream" aria-label="Suche leeren">
                <X className="size-4" />
              </button>
            )}
          </div>
          <Segmented
            layoutId="wines-filter"
            value={filter}
            onChange={(v) => setParams(v === "alle" ? {} : { filter: v }, { replace: true })}
            options={FILTERS.map((f) => ({ value: f.value, label: f.label, count: list.filter(f.test).length }))}
          />
          <ul className="mt-5 space-y-3">
            {visible.map((w, i) => (
              <WineListCard
                key={w.id}
                index={i}
                wine={w.wine_snapshot}
                match={profile ? computeMatch(profile, w.wine_snapshot) : null}
                to={`/weine/${w.id}`}
                favorite={w.is_favorite}
                reason={w.rating?.verdict ? VERDICT_LABEL[w.rating.verdict] : undefined}
                extra={w.rating?.rating ? <span className="text-gold">{"★".repeat(w.rating.rating)}<span className="text-line">{"★".repeat(5 - w.rating.rating)}</span></span> : null}
              />
            ))}
          </ul>
          {visible.length === 0 && (
            <p className="mt-6 rounded-[1.5rem] bg-cream/70 p-5 text-center text-[14px] text-taupe">{q ? `Kein Wein passt zu „${query}“.` : "In dieser Ansicht ist noch nichts."}</p>
          )}
        </>
      )}

      {scans.data && scans.data.length > 0 && (
        <section className="mt-10">
          <SectionTitle title="Frühere Scans" />
          <ul className="divide-y divide-line/70 rounded-[1.5rem] border border-line/60 bg-white/50">
            {scans.data.map((s) => (
              <li key={s.id}>
                <Link
                  to={s.scan_type === "bottle" && s.item_count === 1 && s.top_item ? `/scan/${s.id}/wein/${s.top_item.id}` : `/scan/${s.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-white"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] text-charcoal">{s.top_item ? wineTitle(s.top_item.extracted_data) : "Scan"}</span>
                    <span className="text-[12px] text-taupe">
                      {s.scan_type === "menu" ? `Weinkarte · ${s.item_count} Weine` : "Flasche"} · {formatRelativeDate(s.created_at)}
                    </span>
                  </span>
                  <span className="text-[13px] text-burgundy">Ansehen</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}
