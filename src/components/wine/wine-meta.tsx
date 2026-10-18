import { Grape, MapPin, CalendarDays, Factory } from "lucide-react";
import type { ExtractedWine } from "@shared/wine-schema.ts";
import { WINE_TYPE_LABEL } from "@/lib/taste-profile/describe";
import { cn } from "@/lib/utils";

export function wineTitle(wine: ExtractedWine): string {
  return wine.name ?? (wine.grape_varieties.length ? wine.grape_varieties.join(" / ") : "Unbekannter Wein");
}

export function wineSubtitle(wine: ExtractedWine): string {
  return [WINE_TYPE_LABEL[wine.wine_type], wine.region ?? wine.country].filter(Boolean).join(" · ");
}

/** Faktenzeilen – nur bekannte Angaben; abgeleitete Angaben werden markiert. */
export function WineFacts({ wine, className }: { wine: ExtractedWine; className?: string }) {
  const origin = [wine.region, wine.country].filter(Boolean).join(", ");
  const rows = [
    { icon: Factory, label: "Weingut", value: wine.producer, ev: wine.evidence.producer },
    { icon: MapPin, label: "Herkunft", value: origin || null, ev: wine.evidence.region !== "unknown" ? wine.evidence.region : wine.evidence.country },
    { icon: CalendarDays, label: "Jahrgang", value: wine.vintage ? String(wine.vintage) : null, ev: wine.evidence.vintage },
    { icon: Grape, label: "Rebsorte", value: wine.grape_varieties.join(", ") || null, ev: wine.evidence.grape_varieties },
  ].filter((r) => r.value);
  if (rows.length === 0) return null;
  return (
    <dl className={cn("divide-y divide-line/70", className)}>
      {rows.map(({ icon: Icon, label, value, ev }) => (
        <div key={label} className="flex items-center gap-3 py-3">
          <Icon className="size-[18px] shrink-0 text-gold" />
          <dt className="w-24 shrink-0 text-[14px] text-taupe">{label}</dt>
          <dd className="flex-1 text-[15px] text-charcoal">
            {value}
            {ev === "inferred" && <span className="ml-1.5 text-[12px] text-taupe">(abgeleitet)</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
