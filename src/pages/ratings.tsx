import { Star } from "lucide-react";
import { useNavigate } from "react-router";
import { Page, PageHeading, TopBar } from "@/components/layout/page";
import { EmptyState } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WineListCard } from "@/components/wine/wine-card";
import { useSavedWines, useTasteProfile } from "@/hooks/queries";
import { computeMatch } from "@/lib/matching";
import { DISLIKED_REASONS, LIKED_REASONS, VERDICT_LABEL } from "@/lib/taste-profile/learning";

export default function RatingsPage() {
  const navigate = useNavigate();
  const saved = useSavedWines();
  const { profile } = useTasteProfile();
  const rated = (saved.data ?? []).filter((w) => w.rating).sort((a, b) => b.rating!.updated_at.localeCompare(a.rating!.updated_at));

  return (
    <Page>
      <TopBar />
      <PageHeading title="Deine Bewertungen" subtitle="Jede Bewertung hilft VINO, deinen Geschmack besser zu verstehen." className="pt-0" />
      {saved.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : rated.length === 0 ? (
        <EmptyState
          icon={<Star />}
          title="Noch keine Bewertungen"
          text="Wenn du einen gespeicherten Wein probiert hast, sag uns, wie er dir geschmeckt hat."
          action={<Button size="md" onClick={() => navigate("/weine")}>Zu meinen Weinen</Button>}
        />
      ) : (
        <ul className="space-y-3">
          {rated.map((w, i) => {
            const r = w.rating!;
            const reasons = [...r.liked_reasons.map((x) => LIKED_REASONS[x]), ...r.disliked_reasons.map((x) => DISLIKED_REASONS[x])];
            return (
              <WineListCard
                key={w.id}
                index={i}
                wine={w.wine_snapshot}
                match={profile ? computeMatch(profile, w.wine_snapshot) : null}
                to={`/weine/${w.id}`}
                favorite={w.is_favorite}
                reason={[r.verdict ? VERDICT_LABEL[r.verdict] : null, reasons.join(", ") || null].filter(Boolean).join(" · ")}
                extra={r.rating ? <span className="text-gold">{"★".repeat(r.rating)}<span className="text-line">{"★".repeat(5 - r.rating)}</span></span> : null}
              />
            );
          })}
        </ul>
      )}
    </Page>
  );
}
