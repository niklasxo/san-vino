import { Star } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Textarea } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { useRateWine } from "@/hooks/queries";
import { describeError } from "@/lib/errors";
import {
  DISLIKED_REASONS,
  type DislikedReason,
  LIKED_REASONS,
  type LikedReason,
  VERDICT_LABEL,
  VERDICTS,
  type Verdict,
} from "@/lib/taste-profile/learning";
import { cn } from "@/lib/utils";
import type { WineRating } from "@/types/domain";

const VERDICT_EMOJI: Record<Verdict, string> = { loved: "😍", okay: "🙂", disliked: "😕" };

export function RatingSheet({
  open,
  onOpenChange,
  userWineId,
  wineName,
  existing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userWineId: string;
  wineName: string;
  existing: WineRating | null;
}) {
  const [verdict, setVerdict] = React.useState<Verdict | null>(existing?.verdict ?? null);
  const [stars, setStars] = React.useState<number | null>(existing?.rating ?? null);
  const [liked, setLiked] = React.useState<LikedReason[]>(existing?.liked_reasons ?? []);
  const [disliked, setDisliked] = React.useState<DislikedReason[]>(existing?.disliked_reasons ?? []);
  const [notes, setNotes] = React.useState(existing?.notes ?? "");
  const rate = useRateWine();

  React.useEffect(() => {
    if (!open) return;
    setVerdict(existing?.verdict ?? null);
    setStars(existing?.rating ?? null);
    setLiked(existing?.liked_reasons ?? []);
    setDisliked(existing?.disliked_reasons ?? []);
    setNotes(existing?.notes ?? "");
  }, [open, existing]);

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const save = async () => {
    try {
      await rate.mutateAsync({
        userWineId,
        input: {
          verdict,
          rating: stars,
          liked_reasons: verdict === "disliked" ? [] : liked,
          disliked_reasons: verdict === "loved" ? [] : disliked,
          notes: notes.trim() || null,
        },
      });
      onOpenChange(false);
      toast.success("Danke für deine Bewertung!", {
        description: "SAN VINO lernt aus deiner Bewertung.",
      });
    } catch (err) {
      const d = describeError(err);
      toast.error(d.title, { description: d.text });
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Hast du diesen Wein probiert?"
      description={wineName}
      footer={
        <Button block onClick={save} disabled={(!verdict && !stars) || rate.isPending}>
          {rate.isPending ? "Wird gespeichert …" : "Bewertung speichern"}
        </Button>
      }
    >
      <div className="space-y-2.5" role="radiogroup" aria-label="Wie hat er dir geschmeckt?">
        {VERDICTS.map((v) => (
          <button
            key={v}
            role="radio"
            aria-checked={verdict === v}
            onClick={() => setVerdict(v)}
            className={cn(
              "flex w-full items-center gap-3.5 rounded-[1.25rem] border px-4 py-3.5 text-left text-[16px] transition active:scale-[0.99]",
              verdict === v ? "border-burgundy bg-burgundy/[0.05] font-medium text-burgundy-deep shadow-[0_0_0_1px_var(--color-burgundy)]" : "border-line bg-white/60",
            )}
          >
            <span className="text-[22px]" aria-hidden>
              {VERDICT_EMOJI[v]}
            </span>
            {VERDICT_LABEL[v]}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <p className="mb-2 text-[13px] font-semibold tracking-wide text-taupe uppercase">Sterne (optional)</p>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Sternebewertung">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              role="radio"
              aria-checked={stars === n}
              aria-label={`${n} ${n === 1 ? "Stern" : "Sterne"}`}
              onClick={() => setStars(stars === n ? null : n)}
              className="grid size-11 place-items-center rounded-full transition active:scale-90"
            >
              <Star className={cn("size-7 transition", stars && n <= stars ? "fill-gold text-gold" : "text-line")} strokeWidth={1.5} />
            </button>
          ))}
        </div>
      </div>

      {verdict !== "disliked" && (
        <div className="mt-6">
          <p className="mb-2.5 text-[13px] font-semibold tracking-wide text-taupe uppercase">Was hat dir gefallen?</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(LIKED_REASONS) as LikedReason[]).map((r) => (
              <Chip key={r} selected={liked.includes(r)} onClick={() => setLiked(toggle(liked, r))}>
                {LIKED_REASONS[r]}
              </Chip>
            ))}
          </div>
        </div>
      )}
      {verdict !== "loved" && (
        <div className="mt-6">
          <p className="mb-2.5 text-[13px] font-semibold tracking-wide text-taupe uppercase">Was hat dir nicht gefallen?</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DISLIKED_REASONS) as DislikedReason[]).map((r) => (
              <Chip key={r} selected={disliked.includes(r)} onClick={() => setDisliked(toggle(disliked, r))}>
                {DISLIKED_REASONS[r]}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 mb-2">
        <label htmlFor="rating-notes" className="mb-2 block text-[13px] font-semibold tracking-wide text-taupe uppercase">
          Notiz (optional)
        </label>
        <Textarea id="rating-notes" maxLength={1000} placeholder="z. B. mit Freunden beim Italiener" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Sheet>
  );
}
