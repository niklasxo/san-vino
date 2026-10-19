/**
 * Deterministische Berechnung des Geschmacksprofils aus den Onboarding-Antworten (ältere Profile: bis zu zehn).
 *
 * Prinzip: Jede Antwort liefert „Signale“ (Wert 0–100 + Gewicht) für einzelne
 * Profilmerkmale. Das Merkmal ist der gewichtete Mittelwert aller Signale plus
 * eines neutralen Startwerts (50). Direkte Fragen wiegen schwer (3), indirekte
 * Hinweise leicht (0.3–1.5). Daraus ergibt sich auch die Sicherheit je Merkmal:
 * Wenig oder nur indirekte Signale → Wert bleibt nahe 50 und gilt als unsicher.
 */
import {
  type FruitNote,
  type PreferableWineType,
  USER_PREFERENCE_KEYS,
  type UserPreferenceKey,
  type UserTasteProfile,
} from "@shared/taste-types.ts";
import type { TasteAnswers } from "./questions";

type Signal = [value: number, weight: number];
type SignalMap = Partial<Record<UserPreferenceKey, Signal[]>>;

const PRIOR: Signal = [50, 0.4];
/** Ab dieser Signalsumme gilt ein Merkmal als (fast) vollständig sicher. */
const CERTAINTY_SATURATION = 4.5;

const SINGLE: Record<string, Record<string, SignalMap>> = {
  q1_sweetness: {
    very_sweet: { sweetness_preference: [[90, 3]], fruitiness_preference: [[70, 0.5]] },
    bit_sweet: { sweetness_preference: [[65, 3]] },
    not_so_sweet: { sweetness_preference: [[35, 3]] },
    dry: { sweetness_preference: [[12, 3]] },
  },
  q2_acidity: {
    love: { acidity_preference: [[85, 3]] },
    some: { acidity_preference: [[62, 3]] },
    mild: { acidity_preference: [[38, 3]] },
    dislike: { acidity_preference: [[15, 3]] },
  },
  q4_intensity: {
    light: { intensity_preference: [[20, 3]], body_preference: [[22, 2]] },
    balanced: { intensity_preference: [[45, 3]], body_preference: [[45, 2]] },
    intense: { intensity_preference: [[70, 3]], body_preference: [[68, 2]] },
    max: { intensity_preference: [[90, 3]], body_preference: [[85, 2]] },
  },
  q5_bitterness: {
    // Tannine (das „Herbe“ im Rotwein) fühlen sich ähnlich an wie Bitterkeit –
    // daher nur ein vorsichtiges, indirektes Signal.
    none: { bitterness_tolerance: [[10, 3]], tannin_tolerance: [[18, 1.5]] },
    small: { bitterness_tolerance: [[35, 3]], tannin_tolerance: [[38, 1.5]] },
    like: { bitterness_tolerance: [[65, 3]], tannin_tolerance: [[62, 1.5]] },
    love: { bitterness_tolerance: [[88, 3]], tannin_tolerance: [[80, 1.5]] },
  },
  q7_style: {
    fruity_sweet: { fruitiness_preference: [[85, 2]], sweetness_preference: [[70, 1.5]] },
    fresh_crisp: { acidity_preference: [[72, 1.5]], body_preference: [[30, 1.5]], intensity_preference: [[40, 1]] },
    mild_soft: {
      acidity_preference: [[35, 1.5]],
      tannin_tolerance: [[30, 1.5]],
      body_preference: [[45, 1]],
      bitterness_tolerance: [[30, 1]],
    },
    strong_intense: { body_preference: [[80, 1.5]], intensity_preference: [[80, 1.5]], tannin_tolerance: [[65, 1]] },
    spicy_interesting: { spice_preference: [[75, 1.5]], oak_preference: [[60, 1]], intensity_preference: [[65, 0.8]] },
  },
  q8_oak_spice: {
    none: { oak_preference: [[10, 3]], spice_preference: [[10, 3]] },
    sometimes: { oak_preference: [[35, 3]], spice_preference: [[35, 3]] },
    like: { oak_preference: [[65, 3]], spice_preference: [[65, 3]] },
    love: { oak_preference: [[88, 3]], spice_preference: [[88, 3]] },
  },
  q10_description: {
    fruity_soft: {
      fruitiness_preference: [[85, 2.5]],
      tannin_tolerance: [[35, 1]],
      acidity_preference: [[40, 1]],
      body_preference: [[50, 1]],
    },
    fresh_light: { acidity_preference: [[72, 2]], body_preference: [[25, 2]], intensity_preference: [[35, 1.5]] },
    dry_elegant: {
      sweetness_preference: [[15, 2]],
      acidity_preference: [[55, 1]],
      body_preference: [[55, 1]],
      fruitiness_preference: [[50, 1]],
    },
    strong_spicy: {
      body_preference: [[82, 2]],
      intensity_preference: [[85, 2]],
      spice_preference: [[70, 1.5]],
      tannin_tolerance: [[65, 1.5]],
    },
    sweet_aromatic: { sweetness_preference: [[80, 2.5]], fruitiness_preference: [[80, 1.5]], body_preference: [[60, 1]] },
  },
};

const FRUIT_OPTIONS: Record<string, { notes: FruitNote[]; signals: SignalMap }> = {
  strawberry_cherry: { notes: ["strawberry", "cherry"], signals: { fruitiness_preference: [[80, 0.4]] } },
  raspberry_red: { notes: ["raspberry", "red_berries"], signals: { fruitiness_preference: [[80, 0.4]] } },
  lemon_grapefruit: { notes: ["citrus"], signals: { acidity_preference: [[70, 0.6]] } },
  peach_apricot: { notes: ["peach", "apricot"], signals: { fruitiness_preference: [[75, 0.3]] } },
  mango_tropical: {
    notes: ["tropical"],
    signals: { sweetness_preference: [[65, 0.5]], fruitiness_preference: [[80, 0.5]] },
  },
  blackberry_dark: {
    notes: ["blackberry", "dark_fruit"],
    signals: { body_preference: [[65, 0.5]], intensity_preference: [[65, 0.4]] },
  },
};

/** Frage 6 – bewusst schwach gewichtet (nur Zusatzsignale). */
const DRINK_OPTIONS: Record<string, SignalMap> = {
  cocktails: { sweetness_preference: [[70, 0.4]], fruitiness_preference: [[80, 0.4]] },
  lemonade: { acidity_preference: [[65, 0.4]], sweetness_preference: [[60, 0.3]] },
  coffee: { bitterness_tolerance: [[70, 0.4]], intensity_preference: [[65, 0.3]], oak_preference: [[55, 0.3]] },
  tea: { tannin_tolerance: [[55, 0.4]], bitterness_tolerance: [[55, 0.3]] },
  beer: { bitterness_tolerance: [[60, 0.4]] },
  sweet_drinks: { sweetness_preference: [[80, 0.4]] },
  water: { sweetness_preference: [[25, 0.4]] },
};

const WINE_TYPE_OPTIONS: Record<string, PreferableWineType[]> = {
  red: ["red"],
  white: ["white"],
  rose: ["rose"],
  sparkling: ["sparkling"],
  open: [],
  unknown: [],
};

function addSignals(target: SignalMap, source: SignalMap | undefined) {
  if (!source) return;
  for (const [key, signals] of Object.entries(source) as [UserPreferenceKey, Signal[]][]) {
    (target[key] ??= []).push(...signals);
  }
}

const asArray = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const asSingle = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function computeTasteProfile(answers: TasteAnswers): UserTasteProfile {
  const signals: SignalMap = {};

  for (const key of Object.keys(SINGLE)) {
    const answer = asSingle(answers[key as keyof TasteAnswers]);
    if (answer) addSignals(signals, SINGLE[key][answer]);
  }

  const fruitIds = asArray(answers.q3_fruits).filter((id) => id in FRUIT_OPTIONS);
  const fruitNotes = new Set<FruitNote>();
  for (const id of fruitIds) {
    FRUIT_OPTIONS[id].notes.forEach((n) => fruitNotes.add(n));
    addSignals(signals, FRUIT_OPTIONS[id].signals);
  }
  if (fruitIds.length > 0) {
    // Wer viele Früchte mag, mag Fruchtigkeit tendenziell etwas mehr.
    addSignals(signals, { fruitiness_preference: [[Math.min(90, 50 + fruitIds.length * 10), 1]] });
  }

  for (const id of asArray(answers.q6_drinks)) addSignals(signals, DRINK_OPTIONS[id]);

  const values = {} as Record<UserPreferenceKey, number>;
  const certainty = {} as Record<UserPreferenceKey, number>;
  for (const key of USER_PREFERENCE_KEYS) {
    const list = signals[key] ?? [];
    const all = [PRIOR, ...list];
    const totalWeight = all.reduce((s, [, w]) => s + w, 0);
    const value = all.reduce((s, [v, w]) => s + v * w, 0) / totalWeight;
    const evidence = list.reduce((s, [, w]) => s + w, 0);
    values[key] = Math.round(value);
    certainty[key] = Math.round(Math.min(1, evidence / CERTAINTY_SATURATION) * 100) / 100;
  }

  return {
    ...values,
    preferred_wine_types: WINE_TYPE_OPTIONS[asSingle(answers.q9_wine_type) ?? "open"] ?? [],
    preferred_fruit_notes: [...fruitNotes],
    certainty,
    confidence: "initial",
    ratings_count: 0,
  };
}
