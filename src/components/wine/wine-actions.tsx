import { Check, Heart, ScanLine, Wine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Sticky Aktionsleiste über der Bottom Navigation. */
export function ActionBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("fixed inset-x-0 bottom-[calc(62px+env(safe-area-inset-bottom))] z-30", className)}>
      <div className="mx-auto max-w-xl bg-gradient-to-t from-ivory via-ivory/95 to-ivory/0 px-5 pt-6 pb-3">{children}</div>
    </div>
  );
}

export function WineActions({
  saved,
  favorite,
  tried,
  busy,
  onSave,
  onToggleFavorite,
  onTried,
  onScanAgain,
}: {
  saved: boolean;
  favorite: boolean;
  tried: boolean;
  busy: boolean;
  onSave: () => void;
  onToggleFavorite: () => void;
  onTried: () => void;
  onScanAgain: () => void;
}) {
  return (
    <ActionBar>
      <div className="flex gap-2">
        {saved ? (
          <Button variant="secondary" size="md" className="min-w-0 flex-1" onClick={onToggleFavorite} disabled={busy} aria-pressed={favorite}>
            <Heart className={favorite ? "fill-burgundy" : ""} /> {favorite ? "Favorit" : "Favorisieren"}
          </Button>
        ) : (
          <Button size="md" className="min-w-0 flex-1" onClick={onSave} disabled={busy} aria-label="Speichern: Zu meinen Weinen hinzufügen">
            <Wine /> Speichern
          </Button>
        )}
        <Button variant={saved ? "primary" : "secondary"} size="md" className="min-w-0 flex-1" onClick={onTried} disabled={busy} aria-label={tried ? "Bewertet: Bewertung ändern" : "Probiert: Habe ich probiert"}>
          {tried ? <Check /> : null} {tried ? "Bewertet" : "Probiert"}
        </Button>
        <Button variant="outline" size="icon" className="size-12" onClick={onScanAgain} aria-label="Noch einen Wein scannen">
          <ScanLine />
        </Button>
      </div>
    </ActionBar>
  );
}
