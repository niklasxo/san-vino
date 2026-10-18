import { HelpCircle, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExtractedWine } from "@/types/domain";

export function identificationLevel(wine: ExtractedWine): "sure" | "partial" | "unsure" {
  if (wine.identification_confidence >= 0.75) return "sure";
  if (wine.identification_confidence >= 0.45) return "partial";
  return "unsure";
}

const TEXT = {
  sure: "Gut erkannt",
  partial: "Teilweise erkannt",
  unsure: "Unsicher erkannt",
};

export function IdentificationNotice({ wine, onEdit }: { wine: ExtractedWine; onEdit?: () => void }) {
  const lvl = identificationLevel(wine);
  if (lvl === "sure") return null;
  return (
    <div className="flex gap-3 rounded-[1.5rem] border border-gold/40 bg-gold/10 p-4">
      <HelpCircle className="mt-0.5 size-5 shrink-0 text-gold" />
      <div className="flex-1">
        <p className="font-medium text-charcoal">Wir sind uns nicht ganz sicher. Ist das der richtige Wein?</p>
        <p className="mt-1 text-[14px] leading-relaxed text-taupe">
          {lvl === "unsure"
            ? "Auf dem Foto war nur wenig lesbar. Korrigiere die Angaben oder versuch es mit einem schärferen Foto vom Etikett."
            : "Einige Angaben haben wir abgeleitet. Prüf kurz, ob alles stimmt."}
        </p>
        {onEdit && (
          <Button variant="secondary" size="sm" className="mt-3" onClick={onEdit}>
            <PencilLine /> Angaben korrigieren
          </Button>
        )}
      </div>
    </div>
  );
}

export function IdentificationLine({ wine }: { wine: ExtractedWine }) {
  const lvl = identificationLevel(wine);
  const dots = lvl === "sure" ? 3 : lvl === "partial" ? 2 : 1;
  return (
    <div className="flex items-center justify-between rounded-2xl bg-cream/70 px-4 py-3">
      <div>
        <p className="text-[14px] font-medium text-charcoal">Erkennung: {TEXT[lvl]}</p>
        <p className="text-[12px] text-taupe">Geschmacksangaben sind typische Werte dieses Weinstils.</p>
      </div>
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={i <= dots ? "size-2 rounded-full bg-gold" : "size-2 rounded-full bg-line"} />
        ))}
      </div>
    </div>
  );
}
