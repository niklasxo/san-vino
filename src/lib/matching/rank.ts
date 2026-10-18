import { computeMatch, type MatchResult } from "@shared/matching.ts";
import type { UserTasteProfile } from "@shared/taste-types.ts";
import type { ExtractedWine } from "@shared/wine-schema.ts";
import type { ScanItem } from "@/types/domain";

export interface RankedItem {
  item: ScanItem;
  match: MatchResult;
  /** Derselbe Wein in anderen Größen/Preisen (z. B. Glas, Karaffe, Flasche). */
  variants: ScanItem[];
}

const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Schlüssel für „derselbe Wein“ – unabhängig von Größe und Preis. */
export function wineIdentityKey(w: ExtractedWine): string {
  const name = norm(w.name) || norm(w.grape_varieties.join(" "));
  return [name, norm(w.producer), w.vintage ?? "", w.wine_type].join("|");
}

/** Bevorzugte Variante: Glas vor Karaffe vor Flasche, sonst die günstigste. */
function variantOrder(a: ScanItem, b: ScanItem) {
  const rank = { glass: 0, carafe: 1, bottle: 2, unknown: 3 } as const;
  const ra = rank[a.extracted_data.price_unit ?? "unknown"];
  const rb = rank[b.extracted_data.price_unit ?? "unknown"];
  return ra - rb || (a.price ?? Infinity) - (b.price ?? Infinity) || a.position - b.position;
}

/**
 * Berechnet den Match für das AKTUELLE Profil, fasst denselben Wein in mehreren Größen
 * zu einem Eintrag zusammen und sortiert: sichere, hohe Passungen zuerst; unsichere ans Ende.
 */
export function rankItems(items: ScanItem[], profile: UserTasteProfile): RankedItem[] {
  const groups = new Map<string, ScanItem[]>();
  for (const item of items) {
    const key = wineIdentityKey(item.extracted_data);
    // Ohne Namen/Rebsorte nicht zusammenfassen – sonst würden verschiedene unbekannte Weine verschmelzen.
    const safeKey = key.startsWith("|") ? `__${item.id}` : key;
    groups.set(safeKey, [...(groups.get(safeKey) ?? []), item]);
  }
  return [...groups.values()]
    .map((group) => {
      const [item, ...variants] = [...group].sort(variantOrder);
      return { item, variants, match: computeMatch(profile, item.extracted_data) };
    })
    .sort((a, b) => b.match.rankScore - a.match.rankScore || a.item.position - b.item.position);
}
