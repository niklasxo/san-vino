import { Heart, HelpCircle, Star, Trash2 } from "lucide-react";
import * as React from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Page, TopBar } from "@/components/layout/page";
import { EmptyState, InlineError } from "@/components/layout/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ExplanationPanel } from "@/components/wine/explanation-panel";
import { RatingSheet } from "@/components/wine/rating-sheet";
import { ActionBar } from "@/components/wine/wine-actions";
import { WineDetailView } from "@/components/wine/wine-detail-view";
import { wineTitle } from "@/components/wine/wine-meta";
import { useExplanation, useRemoveSavedWine, useSavedWine, useTasteProfile, useUpdateSavedWine } from "@/hooks/queries";
import { computeMatch, likelyDislikes, likelyLikes } from "@/lib/matching";
import { DISLIKED_REASONS, LIKED_REASONS, VERDICT_LABEL } from "@/lib/taste-profile/learning";
import { isDemo } from "@/services";

export default function SavedWinePage() {
  const { savedId } = useParams();
  const navigate = useNavigate();
  const q = useSavedWine(savedId);
  const { profile, version } = useTasteProfile();
  const update = useUpdateSavedWine();
  const remove = useRemoveSavedWine();
  const [rateOpen, setRateOpen] = React.useState(false);

  const wine = q.data?.wine_snapshot;
  const match = wine && profile ? computeMatch(profile, wine) : null;
  const explanation = useExplanation(q.data?.scan_item_id ?? undefined, version, Boolean(q.data?.scan_item_id && profile));

  if (q.isPending) {
    return (
      <Page>
        <TopBar />
        <Skeleton className="mx-auto mt-6 h-9 w-3/4" />
        <Skeleton className="mt-8 h-72 w-full rounded-[2rem]" />
      </Page>
    );
  }
  if (q.error && !q.data) return <Page><TopBar /><InlineError error={q.error} onRetry={() => q.refetch()} /></Page>;
  if (!q.data || !wine) {
    return (
      <Page>
        <TopBar />
        <EmptyState icon={<HelpCircle />} title="Wein nicht gefunden" text="Vielleicht hast du ihn entfernt." action={<Button size="md" onClick={() => navigate("/weine")}>Zu meinen Weinen</Button>} />
      </Page>
    );
  }
  const saved = q.data;
  const rating = saved.rating;

  return (
    <Page className="pb-[calc(170px+env(safe-area-inset-bottom))]">
      <TopBar
        title="Meine Weine"
        right={
          <ConfirmDialog
            trigger={
              <button className="grid size-11 place-items-center rounded-full text-taupe transition hover:bg-cream" aria-label="Wein entfernen">
                <Trash2 className="size-5" />
              </button>
            }
            title="Wein entfernen?"
            description={rating ? "Der Wein und deine Bewertung werden gelöscht. Dein Geschmacksprofil wird ohne diese Bewertung neu berechnet." : "Der Wein wird aus deiner Sammlung entfernt."}
            confirmLabel="Entfernen"
            destructive
            onConfirm={async () => {
              await remove.mutateAsync(saved.id);
              toast.success("Wein entfernt");
              navigate("/weine", { replace: true });
            }}
          />
        }
      />
      <WineDetailView
        wine={wine}
        match={match}
        headline={saved.is_favorite ? "Einer deiner Favoriten" : "Aus deiner Sammlung"}
        badges={
          <>
            {(isDemo || wine.demo) && <Badge tone="gold">Demo-Daten</Badge>}
            {saved.has_tried && <Badge tone="success">Probiert</Badge>}
          </>
        }
        explanation={
          saved.scan_item_id ? (
            <ExplanationPanel
              explanation={explanation.data}
              loading={explanation.isPending && explanation.fetchStatus !== "idle"}
              error={explanation.error}
              onRetry={() => explanation.refetch()}
              fallback={{ likes: match ? likelyLikes(match, wine) : [], dislikes: match ? likelyDislikes(match) : [] }}
            />
          ) : (
            <ExplanationPanel explanation={null} loading={false} error={null} onRetry={() => {}} fallback={{ likes: match ? likelyLikes(match, wine) : [], dislikes: match ? likelyDislikes(match) : [] }} />
          )
        }
      />

      <section className="mt-6 rounded-[1.75rem] border border-line/60 bg-white/60 p-5">
        <h2 className="font-serif text-[20px] text-charcoal">Hast du diesen Wein probiert?</h2>
        {rating ? (
          <div className="mt-3 space-y-2">
            {rating.verdict && <p className="text-[16px] text-charcoal">{VERDICT_LABEL[rating.verdict]}</p>}
            {rating.rating && (
              <p className="flex gap-0.5" aria-label={`${rating.rating} von 5 Sternen`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={n <= rating.rating! ? "size-5 fill-gold text-gold" : "size-5 text-line"} strokeWidth={1.5} />
                ))}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {rating.liked_reasons.map((r) => <Badge key={r} tone="success">{LIKED_REASONS[r]}</Badge>)}
              {rating.disliked_reasons.map((r) => <Badge key={r} tone="neutral">{DISLIKED_REASONS[r]}</Badge>)}
            </div>
            {rating.notes && <p className="text-[14px] text-taupe italic">„{rating.notes}“</p>}
          </div>
        ) : (
          <p className="mt-2 text-[14px] leading-relaxed text-taupe">Sag uns, wie er dir geschmeckt hat – so lernt SAN VINO deinen Geschmack immer besser kennen.</p>
        )}
      </section>

      <ActionBar>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            aria-pressed={saved.is_favorite}
            onClick={() => update.mutate({ id: saved.id, patch: { is_favorite: !saved.is_favorite } }, { onSuccess: () => q.refetch() })}
          >
            <Heart className={saved.is_favorite ? "fill-burgundy" : ""} /> {saved.is_favorite ? "Favorit" : "Als Favorit"}
          </Button>
          <Button size="md" className="flex-1" onClick={() => setRateOpen(true)}>
            {rating ? "Bewertung ändern" : "Jetzt bewerten"}
          </Button>
        </div>
      </ActionBar>

      <RatingSheet
        open={rateOpen}
        onOpenChange={(o) => {
          setRateOpen(o);
          if (!o) q.refetch();
        }}
        userWineId={saved.id}
        wineName={wineTitle(wine)}
        existing={rating}
      />
    </Page>
  );
}
