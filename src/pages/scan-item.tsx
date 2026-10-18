import { useQueryClient } from "@tanstack/react-query";
import { HelpCircle } from "lucide-react";
import * as React from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Page, TopBar } from "@/components/layout/page";
import { EmptyState, InlineError } from "@/components/layout/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EditWineSheet } from "@/components/wine/edit-wine-sheet";
import { ExplanationPanel } from "@/components/wine/explanation-panel";
import { RatingSheet } from "@/components/wine/rating-sheet";
import { WineActions } from "@/components/wine/wine-actions";
import { WineDetailView } from "@/components/wine/wine-detail-view";
import { wineTitle } from "@/components/wine/wine-meta";
import { keys, useExplanation, useSaveWine, useSavedWineForItem, useScan, useTasteProfile, useUpdateSavedWine } from "@/hooks/queries";
import { computeMatch, likelyDislikes, likelyLikes } from "@/lib/matching";
import { describeError } from "@/lib/errors";
import { ai, isDemo, repository } from "@/services";
import type { ExtractedWine, ScanItem, ScanWithItems } from "@/types/domain";

export default function ScanItemPage() {
  const { scanId, itemId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const scanQuery = useScan(scanId);
  const { profile, version } = useTasteProfile();
  const savedQuery = useSavedWineForItem(itemId);
  const saveWine = useSaveWine();
  const updateSaved = useUpdateSavedWine();
  const [rateOpen, setRateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [savingEdit, setSavingEdit] = React.useState(false);

  const scan = scanQuery.data?.scan;
  const item = scanQuery.data?.items.find((i) => i.id === itemId);
  const match = item && profile ? computeMatch(profile, item.extracted_data) : null;

  // Gespeicherte Erklärung wiederverwenden, wenn sie zum aktuellen Profil & Score passt.
  const cachedValid = Boolean(item?.explanation && item.explanation.profile_version === version && item.explanation.score === match?.score);
  const explanationQuery = useExplanation(itemId, version, Boolean(item && profile && !cachedValid));
  const explanation = cachedValid ? item!.explanation : explanationQuery.data;

  const saved = savedQuery.data ?? null;
  const busy = saveWine.isPending || updateSaved.isPending;

  const refreshSaved = () => qc.invalidateQueries({ queryKey: keys.savedByItem(itemId!) });

  const ensureSaved = async (opts: { favorite?: boolean; tried?: boolean } = {}) => {
    if (saved && !opts.favorite && !opts.tried) return saved;
    const res = await saveWine.mutateAsync({
      scanItemId: item!.id,
      wineId: item!.wine_id,
      snapshot: { ...item!.extracted_data, price: item!.price, currency: item!.currency, saved_from: scan!.scan_type },
      isFavorite: opts.favorite,
      hasTried: opts.tried,
    });
    await refreshSaved();
    return res;
  };

  const onSave = async () => {
    await ensureSaved();
    toast.success("Zu deinen Weinen hinzugefügt");
  };
  const onToggleFavorite = async () => {
    if (!saved) return;
    await updateSaved.mutateAsync({ id: saved.id, patch: { is_favorite: !saved.is_favorite } });
    await refreshSaved();
  };
  const onTried = async () => {
    await ensureSaved();
    setRateOpen(true);
  };

  const onEdit = async (next: ExtractedWine, identityChanged: boolean) => {
    setSavingEdit(true);
    try {
      let updated: ScanItem = await repository.updateScanItem(item!.id, { extracted_data: next });
      // Neue Identität → typische Merkmale neu einschätzen (sonst nur Match aktualisieren).
      if (identityChanged || isDemo) updated = await ai.reestimateScanItem(item!.id);
      qc.setQueryData<ScanWithItems>(keys.scan(scanId!), (prev) => (prev ? { ...prev, items: prev.items.map((i) => (i.id === updated.id ? updated : i)) } : prev));
      await qc.invalidateQueries({ queryKey: ["explanation", item!.id] });
      setEditOpen(false);
      toast.success("Angaben aktualisiert", { description: identityChanged ? "Wir haben den Wein neu eingeschätzt." : undefined });
    } catch (err) {
      const d = describeError(err);
      toast.error(d.title, { description: d.text });
    } finally {
      setSavingEdit(false);
    }
  };

  if (scanQuery.isPending || !profile) {
    return (
      <Page>
        <TopBar />
        <div className="flex flex-col items-center pt-6">
          <Skeleton className="size-14 rounded-2xl" />
          <Skeleton className="mt-5 h-9 w-3/4" />
          <Skeleton className="mt-3 h-4 w-1/2" />
          <Skeleton className="mt-8 h-72 w-full rounded-[2rem]" />
        </div>
      </Page>
    );
  }
  if (scanQuery.error) return <Page><TopBar /><InlineError error={scanQuery.error} onRetry={() => scanQuery.refetch()} /></Page>;
  if (!item || !scan) {
    return (
      <Page>
        <TopBar />
        <EmptyState icon={<HelpCircle />} title="Wein nicht gefunden" text="Dieser Eintrag existiert nicht mehr." action={<Button size="md" onClick={() => navigate("/scannen")}>Neuer Scan</Button>} />
      </Page>
    );
  }

  return (
    <Page className="pb-[calc(170px+env(safe-area-inset-bottom))]">
      <TopBar title={scan.scan_type === "menu" ? "Von der Weinkarte" : undefined} onBack={scan.scan_type === "menu" ? () => navigate(`/scan/${scan.id}`) : undefined} />
      <WineDetailView
        wine={item.extracted_data}
        match={match}
        price={{ value: item.price, currency: item.currency }}
        headline={scan.scan_type === "bottle" ? "Das ist dein Wein-Match." : "Dein Match von der Karte"}
        onEdit={() => setEditOpen(true)}
        badges={
          <>
            {isDemo && <Badge tone="gold">Demo-Daten</Badge>}
            {saved?.is_favorite && <Badge tone="burgundy">Favorit</Badge>}
            {saved?.rating && <Badge tone="success">Bewertet</Badge>}
          </>
        }
        explanation={
          <ExplanationPanel
            explanation={explanation}
            loading={!cachedValid && explanationQuery.isPending && explanationQuery.fetchStatus !== "idle"}
            error={explanationQuery.error}
            onRetry={() => explanationQuery.refetch()}
            fallback={{ likes: match ? likelyLikes(match, item.extracted_data) : [], dislikes: match ? likelyDislikes(match) : [] }}
          />
        }
      />
      <button onClick={() => setEditOpen(true)} className="mt-4 w-full py-2 text-center text-[14px] text-taupe underline-offset-4 hover:underline">
        Angaben stimmen nicht? Korrigieren
      </button>

      <WineActions
        saved={Boolean(saved)}
        favorite={Boolean(saved?.is_favorite)}
        tried={Boolean(saved?.rating)}
        busy={busy}
        onSave={onSave}
        onToggleFavorite={onToggleFavorite}
        onTried={onTried}
        onScanAgain={() => navigate("/scannen")}
      />

      {saved && (
        <RatingSheet
          open={rateOpen}
          onOpenChange={(o) => {
            setRateOpen(o);
            if (!o) refreshSaved();
          }}
          userWineId={saved.id}
          wineName={wineTitle(item.extracted_data)}
          existing={saved.rating}
        />
      )}
      <EditWineSheet open={editOpen} onOpenChange={setEditOpen} wine={item.extracted_data} onSave={onEdit} saving={savingEdit} />
    </Page>
  );
}
