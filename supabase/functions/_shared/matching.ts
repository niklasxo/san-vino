/**
 * VINO Matching-Algorithmus
 * ─────────────────────────
 * Beantwortet ausschließlich: „Wie gut passt dieser Wein zu DIESEM Geschmacksprofil?“
 * Preis, Bekanntheit oder Expertenbewertungen spielen keine Rolle.
 *
 * Der Score ist eine heuristische Übereinstimmungsbewertung (0–100),
 * KEINE statistisch kalibrierte Wahrscheinlichkeit.
 *
 * Ablauf:
 *  1. Für jedes Weinmerkmal mit belastbarem Wert wird eine Ähnlichkeit (0–1) berechnet.
 *     Je nach Merkmal unterschiedlich modelliert:
 *       - "ideal":      Wunschwert, Abweichung in beide Richtungen stört (Süße, Säure …)
 *       - "tolerance":  Obergrenze – darunter kaum Abzug, darüber deutlich (Tannine)
 *       - "preference": Vorliebe – zu viel stört stärker als zu wenig (Holz, Würze)
 *  2. Gewichteter Mittelwert. Effektives Gewicht = Basisgewicht
 *       × Verlässlichkeit der Weinangabe (Wissen 1.0, Stilschätzung 0.7, unbekannt 0)
 *       × Sicherheit des Nutzerwerts (0.5 … 1.0)
 *     Unbekannte Merkmale fließen NICHT als neutraler Wert ein, sondern gar nicht.
 *  3. Nichtlineare Spreizung (S^2.5), damit sich gute und schlechte Passungen klar unterscheiden.
 *  4. Kleine Korrekturen für bevorzugte Weinarten und Fruchtnoten (schließen nie aus).
 *  5. Zuverlässigkeit aus Abdeckung der Merkmale und Identifikationssicherheit.
 */
import {
  DIMENSION_TO_PREFERENCE,
  type FruitNote,
  type PropertySource,
  type UserTasteProfile,
  WINE_DIMENSIONS,
  type WineDimension,
  type WineTasteProperties,
  type WineType,
} from "./taste-types.ts";

export const MATCHING_VERSION = 1;

/** Anfangsgewichte – sinnvolle Startwerte, nicht wissenschaftlich validiert. */
export const MATCH_WEIGHTS: Record<WineDimension, number> = {
  sweetness: 0.2,
  acidity: 0.15,
  body: 0.15,
  fruitiness: 0.15,
  tannins: 0.15,
  intensity: 0.1,
  oak: 0.05,
  spice: 0.05,
};

export const SOURCE_RELIABILITY: Record<PropertySource, number> = {
  knowledge: 1,
  style_estimate: 0.7,
  unknown: 0,
};

type DimensionModel = "ideal" | "tolerance" | "preference";
const DIMENSION_MODEL: Record<WineDimension, DimensionModel> = {
  sweetness: "ideal",
  acidity: "ideal",
  body: "ideal",
  fruitiness: "ideal",
  intensity: "ideal",
  tannins: "tolerance",
  oak: "preference",
  spice: "preference",
};

const SCORE_EXPONENT = 2.5;
const IDEAL_TOLERANCE = 10;

export type MatchConfidence = "high" | "medium" | "low" | "insufficient";

export interface DimensionBreakdown {
  dimension: WineDimension;
  userValue: number;
  wineValue: number;
  source: PropertySource;
  similarity: number;
  effectiveWeight: number;
  /** >0: Wein hat mehr davon als gewünscht, <0: weniger. */
  direction: number;
}

export interface MatchInput {
  wine_type: WineType;
  taste_properties: WineTasteProperties;
  identification_confidence: number;
  fruit_note_keys?: FruitNote[];
}

export interface MatchResult {
  /** 0–100, gerundet. Nur anzeigen, wenn confidence !== "insufficient". */
  score: number;
  confidence: MatchConfidence;
  /** Anteil der Gewichte, für die belastbare Weinmerkmale vorliegen (0–1). */
  coverage: number;
  /** Gesamt-Zuverlässigkeit 0–1 (Abdeckung × Identifikation). */
  reliability: number;
  /** Sortierschlüssel: unsichere Ergebnisse rutschen nach hinten. */
  rankScore: number;
  breakdown: DimensionBreakdown[];
  adjustments: { reason: "wine_type_preferred" | "wine_type_other" | "fruit_notes"; points: number }[];
  version: number;
}

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export function dimensionSimilarity(model: DimensionModel, user: number, wine: number): number {
  switch (model) {
    case "ideal": {
      const d = Math.max(0, Math.abs(user - wine) - IDEAL_TOLERANCE);
      return clamp(1 - d / (100 - IDEAL_TOLERANCE));
    }
    case "tolerance": {
      // Bis knapp über der Toleranz kaum Abzug; deutlich darüber stark.
      const over = Math.max(0, wine - user - 5);
      const under = Math.max(0, user - wine);
      return clamp(1 - over / 60 - (under / 100) * 0.25);
    }
    case "preference": {
      const over = Math.max(0, wine - user - IDEAL_TOLERANCE);
      const under = Math.max(0, user - wine - IDEAL_TOLERANCE);
      return clamp(1 - over / 70 - (under / 100) * 0.8);
    }
  }
}

export function computeMatch(profile: UserTasteProfile, wine: MatchInput): MatchResult {
  const breakdown: DimensionBreakdown[] = [];
  let weightedSim = 0;
  let totalEffective = 0;
  let coveredBase = 0;
  let totalBase = 0;

  for (const dim of WINE_DIMENSIONS) {
    const base = MATCH_WEIGHTS[dim];
    totalBase += base;
    const prop = wine.taste_properties[dim];
    if (!prop || prop.value == null || prop.source === "unknown") continue;

    const prefKey = DIMENSION_TO_PREFERENCE[dim];
    const userValue = profile[prefKey];
    const certainty = clamp(profile.certainty?.[prefKey] ?? 0.5);
    const reliability = SOURCE_RELIABILITY[prop.source];
    const effectiveWeight = base * reliability * (0.5 + 0.5 * certainty);
    const wineValue = clamp(prop.value, 0, 100);
    const similarity = dimensionSimilarity(DIMENSION_MODEL[dim], userValue, wineValue);

    coveredBase += base * reliability;
    weightedSim += similarity * effectiveWeight;
    totalEffective += effectiveWeight;
    breakdown.push({
      dimension: dim,
      userValue,
      wineValue,
      source: prop.source,
      similarity: round(similarity, 3),
      effectiveWeight: round(effectiveWeight, 4),
      direction: Math.sign(wineValue - userValue) * Math.max(0, Math.abs(wineValue - userValue) - IDEAL_TOLERANCE),
    });
  }

  const coverage = totalBase > 0 ? coveredBase / totalBase : 0;
  const identification = clamp(wine.identification_confidence);
  const reliability = coverage * (0.4 + 0.6 * identification);

  const rawSimilarity = totalEffective > 0 ? weightedSim / totalEffective : 0.5;
  let score = 100 * Math.pow(rawSimilarity, SCORE_EXPONENT);

  const adjustments: MatchResult["adjustments"] = [];
  const preferred = profile.preferred_wine_types ?? [];
  const typeKnown = ["red", "white", "rose", "sparkling"].includes(wine.wine_type);
  if (preferred.length > 0 && typeKnown && totalEffective > 0) {
    if ((preferred as string[]).includes(wine.wine_type)) adjustments.push({ reason: "wine_type_preferred", points: 4 });
    else adjustments.push({ reason: "wine_type_other", points: -5 });
  }
  const overlap = (wine.fruit_note_keys ?? []).filter((n) => profile.preferred_fruit_notes?.includes(n)).length;
  if (overlap > 0 && totalEffective > 0) adjustments.push({ reason: "fruit_notes", points: Math.min(4, overlap * 1.5) });

  score += adjustments.reduce((s, a) => s + a.points, 0);
  score = Math.round(clamp(score, 0, 100));

  let confidence: MatchConfidence;
  if (coverage < 0.45 || identification < 0.3) confidence = "insufficient";
  else if (reliability >= 0.7) confidence = "high";
  else if (reliability >= 0.45) confidence = "medium";
  else confidence = "low";

  const rankScore =
    confidence === "insufficient" ? -100 + score / 100 : confidence === "low" ? 50 + (score - 50) * 0.8 : score;

  return {
    score,
    confidence,
    coverage: round(coverage, 3),
    reliability: round(reliability, 3),
    rankScore: round(rankScore, 3),
    breakdown,
    adjustments,
    version: MATCHING_VERSION,
  };
}

export type MatchCategory = "excellent" | "good" | "maybe" | "unlikely" | "uncertain";

export function matchCategory(result: Pick<MatchResult, "score" | "confidence">): MatchCategory {
  if (result.confidence === "insufficient") return "uncertain";
  if (result.score >= 85) return "excellent";
  if (result.score >= 70) return "good";
  if (result.score >= 50) return "maybe";
  return "unlikely";
}

export const MATCH_CATEGORY_LABEL: Record<MatchCategory, string> = {
  excellent: "Passt sehr gut zu deinem Geschmack",
  good: "Könnte dir gut gefallen",
  maybe: "Vielleicht etwas für dich",
  unlikely: "Wahrscheinlich weniger dein Geschmack",
  uncertain: "Einschätzung noch unsicher",
};

function round(v: number, digits: number) {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
