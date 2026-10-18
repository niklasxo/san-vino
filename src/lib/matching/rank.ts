import { computeMatch, type MatchResult } from "@shared/matching.ts";
import type { UserTasteProfile } from "@shared/taste-types.ts";
import type { ScanItem } from "@/types/domain";

export interface RankedItem {
  item: ScanItem;
  match: MatchResult;
}

/**
 * Berechnet den Match für das AKTUELLE Profil (das sich durch Bewertungen weiterentwickelt)
 * und sortiert: sichere, hohe Passungen zuerst; unsichere Einschätzungen ans Ende.
 * Deterministisch: bei Gleichstand entscheidet die Position auf der Karte.
 */
export function rankItems(items: ScanItem[], profile: UserTasteProfile): RankedItem[] {
  return items
    .map((item) => ({ item, match: computeMatch(profile, item.extracted_data) }))
    .sort((a, b) => b.match.rankScore - a.match.rankScore || a.item.position - b.item.position);
}
