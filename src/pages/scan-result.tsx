import { Camera, HelpCircle, Trash2 } from "lucide-react";
import * as React from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Page, PageHeading, TopBar } from "@/components/layout/page";
import { EmptyState, InlineError } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/chip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FavoriteCard, WineListCard } from "@/components/wine/wine-card";
import { useScan, useTasteProfile } from "@/hooks/queries";
import { rankItems, shortReason } from "@/lib/matching";
import { useQueryClient } from "@tanstack/react-query";
import { keys } from "@/hooks/queries";
import { repository } from "@/services";
import { formatPrice } from "@/lib/utils";
import { priceLabel } from "@/components/wine/price";
import type { ScanItem } from "@/types/domain";

/** „Auch: 32,00 € pro Flasche“ – andere Größen desselben Weins. */
function variantsNote(variants: ScanItem[]) {
  const labels = variants.map((v) => priceLabel(v.extracted_data, v.price, v.currency)?.text).filter(Boolean);
  return labels.length ? <span className="text-taupe">Auch: {labels.join(" · ")}</span> : null;
}

type TypeFilter = "all" | "red" | "white" | "rose" | "sparkling";
const TYPE_LABEL: Record<TypeFilter, string> = { all: "Alle", red: "Rotwein", white: "Weißwein", rose: "Rosé", sparkling: "Schaumwein" };

export default function ScanResultPage() {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const scanQuery = useScan(scanId);
  const { profile } = useTasteProfile();
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("all");
  const [maxPrice, setMaxPrice] = React.useState<number | null>(null);

  const ranked = React.useMemo(() => (scanQuery.data && profile ? rankItems(scanQuery.data.items, profile) : []), [scanQuery.data, profile]);

  const deleteScan = async () => {
    await repository.deleteScan(scanId!);
    qc.removeQueries({ queryKey: keys.scan(scanId!) });
    await qc.invalidateQueries({ queryKey: keys.recentScans });
    toast.success("Scan und Fotos gelöscht");
    navigate("/", { replace: true });
  };

  const topBar = (
    <TopBar
      right={
        scanQuery.data && (
          <ConfirmDialog
            trigger={
              <button className="grid size-11 place-items-center rounded-full text-taupe transition hover:bg-cream" aria-label="Scan löschen">
                <Trash2 className="size-5" />
              </button>
            }
            title="Scan löschen?"
            description="Die Fotos und die erkannten Weine dieses Scans werden gelöscht. Gespeicherte Weine bleiben in „Meine Weine“ erhalten."
            confirmLabel="Löschen"
            destructive
            onConfirm={deleteScan}
          />
        )
      }
    />
  );

  if (scanQuery.isPending || !profile) {
    return (
      <Page>
        {topBar}
        <Skeleton className="mt-6 h-10 w-3/4" />
        <Skeleton className="mt-3 h-5 w-2/3" />
        <Skeleton className="mt-8 h-64 w-full rounded-[2rem]" />
        <Skeleton className="mt-4 h-24 w-full" />
        <Skeleton className="mt-3 h-24 w-full" />
      </Page>
    );
  }
  if (scanQuery.error) return <Page>{topBar}<InlineError error={scanQuery.error} onRetry={() => scanQuery.refetch()} /></Page>;
  if (!scanQuery.data) return <Page>{topBar}<EmptyState icon={<HelpCircle />} title="Scan nicht gefunden" text="Vielleicht wurde er gelöscht." action={<Button size="md" onClick={() => navigate("/scannen")}>Neuer Scan</Button>} /></Page>;

  const { scan, items } = scanQuery.data;
  if (scan.status !== "analyzed" || items.length === 0) {
    return (
      <Page>
        {topBar}
        <EmptyState
          icon={<Camera />}
          title={scan.status === "unreadable" ? "Das Foto war nicht lesbar" : scan.status === "failed" ? "Die Analyse hat nicht geklappt" : "Keine Weine erkannt"}
          text={scan.analysis_meta?.notes_for_user ?? "Versuch es mit einem neuen, gut beleuchteten Foto."}
          action={<Button size="md" onClick={() => navigate(scan.scan_type === "menu" ? "/scannen?typ=karte" : "/scannen")}>Neues Foto</Button>}
        />
      </Page>
    );
  }
  if (scan.scan_type === "bottle" && items.length === 1) return <Navigate to={`/scan/${scan.id}/wein/${items[0].id}`} replace />;

  // ── Mehrere Flaschen auf einem Foto ──
  if (scan.scan_type === "bottle") {
    return (
      <Page>
        {topBar}
        <PageHeading title="Wir haben mehrere Weine erkannt." subtitle="Welchen meinst du? Tipp ihn an, um dein Match zu sehen." />
        <ul className="space-y-3">
          {ranked.map(({ item, match }, i) => (
            <WineListCard key={item.id} index={i} wine={item.extracted_data} match={match} to={`/scan/${scan.id}/wein/${item.id}`} />
          ))}
        </ul>
      </Page>
    );
  }

  // ── Weinkarte ──
  const presentTypes = (["red", "white", "rose", "sparkling"] as const).filter((t) => ranked.some((r) => r.item.extracted_data.wine_type === t));
  const prices = items.map((i) => i.price).filter((p): p is number => p != null);
  const currency = items.find((i) => i.currency)?.currency ?? "EUR";
  const priceSteps = [8, 10, 15, 25, 50, 100].filter((s) => prices.some((p) => p <= s) && prices.some((p) => p > s)).slice(0, 3);

  const filtered = ranked.filter(({ item, variants }) => {
    if (typeFilter !== "all" && item.extracted_data.wine_type !== typeFilter) return false;
    if (maxPrice != null && ![item, ...variants].some((v) => v.price != null && v.price <= maxPrice)) return false;
    return true;
  });
  const confident = filtered.filter((r) => r.match.confidence !== "insufficient");
  const unsure = filtered.filter((r) => r.match.confidence === "insufficient");
  const favorite = typeFilter === "all" && maxPrice == null ? confident[0] : undefined;
  const rest = favorite ? confident.slice(1) : confident;

  return (
    <Page>
      {topBar}
      <PageHeading eyebrow={`${ranked.length} ${ranked.length === 1 ? "Wein" : "Weine"} erkannt`} title="Diese Weine passen zu dir." subtitle="Wir haben die Weinkarte mit deinem persönlichen Geschmack verglichen." className="pt-2" />

      {favorite && (
        <FavoriteCard
          wine={favorite.item.extracted_data}
          match={favorite.match}
          reason={shortReason(favorite.match, favorite.item.extracted_data)}
          to={`/scan/${scan.id}/wein/${favorite.item.id}`}
        />
      )}

      <div className="mt-7 space-y-3">
        {presentTypes.length > 1 && (
          <Segmented
            layoutId="menu-filter"
            value={typeFilter}
            onChange={setTypeFilter}
            options={(["all", ...presentTypes] as TypeFilter[]).map((t) => ({
              value: t,
              label: TYPE_LABEL[t],
              count: t === "all" ? ranked.length : ranked.filter((r) => r.item.extracted_data.wine_type === t).length,
            }))}
          />
        )}
        {priceSteps.length > 0 && (
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {priceSteps.map((s) => (
              <button
                key={s}
                onClick={() => setMaxPrice(maxPrice === s ? null : s)}
                className={
                  maxPrice === s
                    ? "h-9 shrink-0 rounded-full bg-gold/30 px-3.5 text-[13px] font-medium text-burgundy-deep"
                    : "h-9 shrink-0 rounded-full border border-line px-3.5 text-[13px] text-taupe"
                }
              >
                bis {formatPrice(s, currency)?.replace(",00", "")}
              </button>
            ))}
          </div>
        )}
      </div>

      <h2 className="mt-6 mb-3 font-serif text-[20px] text-charcoal">{favorite ? "Weitere Empfehlungen" : "Nach Passung sortiert"}</h2>
      {rest.length === 0 && !favorite ? (
        <p className="rounded-2xl bg-cream/70 p-4 text-[14px] text-taupe">Für diesen Filter gibt es keine sicheren Einschätzungen.</p>
      ) : (
        <ul className="space-y-3">
          {rest.map(({ item, match, variants }, i) => (
            <WineListCard key={item.id} index={i} rank={(favorite ? 2 : 1) + i} wine={item.extracted_data} match={match} to={`/scan/${scan.id}/wein/${item.id}`} extra={variantsNote(variants)} />
          ))}
        </ul>
      )}

      {unsure.length > 0 && (
        <section className="mt-8">
          <h2 className="font-serif text-[20px] text-charcoal">Zu wenig Infos</h2>
          <p className="mt-1 mb-3 text-[14px] text-taupe">Diese Einträge konnten wir nicht sicher einschätzen – zum Beispiel, weil nur ein Name auf der Karte steht.</p>
          <ul className="space-y-3">
            {unsure.map(({ item, match, variants }, i) => (
              <WineListCard key={item.id} index={i} wine={item.extracted_data} match={match} to={`/scan/${scan.id}/wein/${item.id}`} extra={variantsNote(variants)} />
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 text-center text-[12px] leading-relaxed text-taupe">
        Der Match ist eine geschätzte persönliche Passung – keine Qualitätsbewertung und keine Garantie.
      </p>
      <Button variant="secondary" block className="mt-5" onClick={() => navigate("/scannen?typ=karte")}>
        <Camera /> Noch eine Weinkarte scannen
      </Button>
    </Page>
  );
}
