/**
 * Lernfunktion: verbessert das Geschmacksprofil anhand echter Weinbewertungen.
 *
 * Grundsätze:
 *  - Das gelernte Profil wird IMMER aus Ausgangsprofil + allen Bewertungen neu
 *    berechnet. Dadurch ist es reihenfolgeunabhängig und das Onboarding-Profil
 *    bleibt jederzeit rekonstruierbar.
 *  - Eine einzelne Bewertung verschiebt ein Merkmal um höchstens MAX_STEP Punkte.
 *  - Übereinstimmende Bewertungen addieren sich, widersprüchliche heben sich auf.
 *  - Gesamtabweichung vom Ausgangsprofil ist auf MAX_TOTAL_SHIFT begrenzt.
 *  - Merkmale, die beim Wein unbekannt sind, verändern das Profil NICHT.
 */
import { SOURCE_RELIABILITY } from "@shared/matching.ts";
import {
  DIMENSION_TO_PREFERENCE,
  type PreferableWineType,
  type ProfileConfidence,
  type UserPreferenceKey,
  type UserTasteProfile,
  WINE_DIMENSIONS,
  type WineDimension,
  type WineTasteProperties,
  type WineType,
} from "@shared/taste-types.ts";

export const MAX_STEP = 8;
export const MAX_TOTAL_SHIFT = 25;
const GENERAL_PULL_RATE = 0.15;
const GENERAL_PUSH_RATE = 0.06;
const REASON_RATE = 0.3;

export const VERDICTS = ["loved", "okay", "disliked"] as const;
export type Verdict = (typeof VERDICTS)[number];

export const LIKED_REASONS = {
  fruity: "Schön fruchtig",
  sweet: "Angenehm süß",
  fresh: "Schön frisch",
  soft: "Weich und mild",
  strong: "Kräftiger Geschmack",
  dry: "Angenehm trocken",
} as const;
export type LikedReason = keyof typeof LIKED_REASONS;

export const DISLIKED_REASONS = {
  too_sour: "Zu sauer",
  too_dry: "Zu trocken",
  too_bitter: "Zu bitter",
  too_sweet: "Zu süß",
  too_strong: "Zu kräftig",
  too_bland: "Zu wenig Geschmack",
} as const;
export type DislikedReason = keyof typeof DISLIKED_REASONS;

export const VERDICT_LABEL: Record<Verdict, string> = {
  loved: "Hat mir richtig gut geschmeckt",
  okay: "War ganz okay",
  disliked: "War nicht mein Geschmack",
};

export interface RatingForLearning {
  verdict: Verdict | null;
  rating: number | null;
  liked_reasons: LikedReason[];
  disliked_reasons: DislikedReason[];
  wine: {
    wine_type: WineType;
    taste_properties: WineTasteProperties;
    identification_confidence: number;
  };
}

/** Bewertung → Stimmung zwischen -1 (gar nicht) und +1 (sehr gut). */
export function sentiment(r: Pick<RatingForLearning, "verdict" | "rating">): number {
  const v = r.verdict === "loved" ? 1 : r.verdict === "okay" ? 0.2 : r.verdict === "disliked" ? -1 : null;
  const s = r.rating != null ? (Math.min(5, Math.max(1, r.rating)) - 3) / 2 : null;
  if (v != null && s != null) return (v + s) / 2;
  return v ?? s ?? 0;
}

type Target = { dims: WineDimension[]; target: (wine: number) => number; alsoBitterness?: boolean };

/** Gemochte Gründe ziehen das Profil zum Weinwert hin. */
const LIKED_TARGETS: Record<LikedReason, Target> = {
  fruity: { dims: ["fruitiness"], target: (w) => w },
  sweet: { dims: ["sweetness"], target: (w) => w },
  fresh: { dims: ["acidity"], target: (w) => w },
  soft: { dims: ["acidity", "body"], target: (w) => w },
  strong: { dims: ["body", "intensity"], target: (w) => w },
  dry: { dims: ["sweetness"], target: (w) => w },
};

/** Störende Gründe: Der Wunschwert sollte deutlich unter/über dem Weinwert liegen. */
const DISLIKED_TARGETS: Record<DislikedReason, Target> = {
  too_sour: { dims: ["acidity"], target: (w) => w - 15 },
  too_dry: { dims: ["sweetness"], target: (w) => w + 15 },
  too_bitter: { dims: ["tannins"], target: (w) => w - 15, alsoBitterness: true },
  too_sweet: { dims: ["sweetness"], target: (w) => w - 15 },
  too_strong: { dims: ["body", "intensity"], target: (w) => w - 15 },
  too_bland: { dims: ["intensity"], target: (w) => w + 15 },
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const clampStep = (v: number) => clamp(v, -MAX_STEP, MAX_STEP);

/** Änderungen, die genau eine Bewertung bewirkt (relativ zum Ausgangsprofil). */
export function ratingDeltas(initial: UserTasteProfile, r: RatingForLearning): Partial<Record<UserPreferenceKey, number>> {
  const s = sentiment(r);
  const identFactor = 0.5 + 0.5 * clamp(r.wine.identification_confidence, 0, 1);
  const deltas: Partial<Record<UserPreferenceKey, number>> = {};
  const add = (k: UserPreferenceKey, d: number) => (deltas[k] = (deltas[k] ?? 0) + d);

  const known = (dim: WineDimension) => {
    const p = r.wine.taste_properties[dim];
    return p && p.value != null && p.source !== "unknown" ? { value: p.value, rel: SOURCE_RELIABILITY[p.source] * identFactor } : null;
  };

  // 1) Allgemeines Signal aus der Gesamtbewertung
  for (const dim of WINE_DIMENSIONS) {
    const k = known(dim);
    if (!k) continue;
    const pref = DIMENSION_TO_PREFERENCE[dim];
    const diff = k.value - initial[pref];
    if (s > 0) {
      // Bei Toleranzen (Tannine) nur nach oben lernen: weniger Herbe als toleriert ist kein Signal.
      if (dim === "tannins" && diff < 0) continue;
      add(pref, diff * GENERAL_PULL_RATE * s * k.rel);
    } else if (s < 0 && Math.abs(diff) < 25) {
      // Wein lag nah am vermuteten Ideal und hat trotzdem nicht geschmeckt → leicht wegbewegen.
      const away = diff === 0 ? 0 : -Math.sign(diff) * (25 - Math.abs(diff));
      add(pref, away * GENERAL_PUSH_RATE * Math.abs(s) * k.rel);
    }
  }

  // 2) Gezielte Gründe
  const applyTarget = (t: Target, mode: "liked" | "disliked") => {
    for (const dim of t.dims) {
      const k = known(dim);
      if (!k) continue;
      const pref = DIMENSION_TO_PREFERENCE[dim];
      const target = clamp(t.target(k.value), 0, 100);
      let diff = target - initial[pref];
      // Bei Abneigungen: Liegt das Profil schon auf der „richtigen Seite“, nur ein kleiner Schubs.
      if (mode === "disliked") {
        const shouldBeBelow = t.target(k.value) < k.value;
        if (shouldBeBelow && diff >= 0) diff = -6;
        else if (!shouldBeBelow && diff <= 0) diff = 6;
        if ((shouldBeBelow && diff > 0) || (!shouldBeBelow && diff < 0)) diff = shouldBeBelow ? -6 : 6;
      }
      const d = diff * REASON_RATE * k.rel;
      add(pref, d);
      if (t.alsoBitterness) add("bitterness_tolerance", d * 0.5);
    }
  };
  r.liked_reasons.forEach((reason) => LIKED_TARGETS[reason] && applyTarget(LIKED_TARGETS[reason], "liked"));
  r.disliked_reasons.forEach((reason) => DISLIKED_TARGETS[reason] && applyTarget(DISLIKED_TARGETS[reason], "disliked"));

  for (const k of Object.keys(deltas) as UserPreferenceKey[]) deltas[k] = clampStep(deltas[k]!);
  return deltas;
}

export function confidenceFor(count: number): ProfileConfidence {
  if (count === 0) return "initial";
  if (count < 5) return "learning";
  return "established";
}

/** Berechnet das gelernte Profil vollständig neu. Reine Funktion – leicht testbar. */
export function rebuildLearnedProfile(initial: UserTasteProfile, ratings: RatingForLearning[]): UserTasteProfile {
  const totals: Partial<Record<UserPreferenceKey, number>> = {};
  const contributions: Partial<Record<UserPreferenceKey, number>> = {};

  for (const r of ratings) {
    const deltas = ratingDeltas(initial, r);
    for (const [k, d] of Object.entries(deltas) as [UserPreferenceKey, number][]) {
      if (Math.abs(d) < 0.01) continue;
      totals[k] = (totals[k] ?? 0) + d;
      contributions[k] = (contributions[k] ?? 0) + 1;
    }
  }

  const next: UserTasteProfile = {
    ...initial,
    certainty: { ...initial.certainty },
    preferred_wine_types: [...initial.preferred_wine_types],
    preferred_fruit_notes: [...initial.preferred_fruit_notes],
  };
  for (const [k, total] of Object.entries(totals) as [UserPreferenceKey, number][]) {
    const shift = clamp(total, -MAX_TOTAL_SHIFT, MAX_TOTAL_SHIFT);
    next[k] = Math.round(clamp(initial[k] + shift, 0, 100));
    // Sicherheit steigt nur – direkt erfragte Werte (bis 1,0) werden nicht abgesenkt.
    const raised = Math.round(Math.min(0.95, initial.certainty[k] + 0.05 * (contributions[k] ?? 0)) * 100) / 100;
    next.certainty[k] = Math.max(initial.certainty[k], raised);
  }

  // Weinarten, die mehrfach begeistert haben, werden ergänzt – nie entfernt.
  if (next.preferred_wine_types.length > 0) {
    const lovedByType = new Map<WineType, number>();
    for (const r of ratings) if (sentiment(r) >= 0.75) lovedByType.set(r.wine.wine_type, (lovedByType.get(r.wine.wine_type) ?? 0) + 1);
    for (const [type, count] of lovedByType) {
      if (count >= 2 && ["red", "white", "rose", "sparkling"].includes(type) && !next.preferred_wine_types.includes(type as PreferableWineType)) {
        next.preferred_wine_types.push(type as PreferableWineType);
      }
    }
  }

  next.ratings_count = ratings.length;
  next.confidence = confidenceFor(ratings.length);
  return next;
}
