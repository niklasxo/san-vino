import { Info, Minus, Plus, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { describeError } from "@/lib/errors";
import type { StoredExplanation } from "@/types/domain";

export function ExplanationSkeleton() {
  return (
    <div className="space-y-3" aria-label="Erklärung wird geschrieben" role="status">
      <Skeleton className="h-6 w-4/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-2/3" />
      <p className="pt-1 text-[13px] text-taupe">Wir vergleichen ihn mit deinem Geschmack …</p>
    </div>
  );
}

export function ExplanationPanel({
  explanation,
  loading,
  error,
  onRetry,
  fallback,
}: {
  explanation: StoredExplanation | null | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  /** Regelbasierte Punkte, falls (noch) keine KI-Erklärung vorliegt. */
  fallback: { likes: string[]; dislikes: string[] };
}) {
  if (loading) return <ExplanationSkeleton />;
  if (!explanation) {
    return (
      <div className="space-y-5">
        <ReasonList title="Das könnte dir gefallen" items={fallback.likes} positive />
        <ReasonList title="Das könnte weniger dein Ding sein" items={fallback.dislikes} />
        {error != null && (
          <div className="rounded-2xl bg-cream p-4 text-[14px] text-taupe">
            <p className="font-medium text-charcoal">{describeError(error).title}</p>
            <p className="mt-0.5">Die persönliche Erklärung konnte gerade nicht geschrieben werden.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
              <RotateCcw /> Nochmal versuchen
            </Button>
          </div>
        )}
      </div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div>
        <h3 className="font-serif text-[22px] leading-snug text-charcoal">{explanation.headline}</h3>
        <p className="mt-2.5 text-[15px] leading-relaxed text-charcoal/85">{explanation.why}</p>
      </div>
      <ReasonList title="Das könnte dir gefallen" items={explanation.might_like} positive />
      <ReasonList title="Das könnte weniger dein Ding sein" items={explanation.might_not_like} />
      {explanation.uncertainty_note && (
        <p className="flex gap-2 rounded-2xl bg-gold/12 p-3.5 text-[13px] leading-relaxed text-burgundy-deep">
          <Info className="mt-0.5 size-4 shrink-0" /> {explanation.uncertainty_note}
        </p>
      )}
      <p className="text-[11px] text-taupe">
        {explanation.demo ? "Demo-Erklärung (regelbasiert, ohne KI)" : "Persönlich formuliert von SAN VINO · Der Match-Score wird nicht von der KI vergeben."}
      </p>
    </motion.div>
  );
}

function ReasonList({ title, items, positive }: { title: string; items: string[]; positive?: boolean }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold tracking-wide text-taupe uppercase">{title}</p>
      <ul className="space-y-2">
        {items.map((t) => (
          <li key={t} className="flex gap-2.5 text-[15px] leading-snug text-charcoal">
            <span className={positive ? "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success/15 text-success" : "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-cream-deep text-taupe"}>
              {positive ? <Plus className="size-3" strokeWidth={3} /> : <Minus className="size-3" strokeWidth={3} />}
            </span>
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
