/**
 * Leitet aus dem Profil einen persönlichen Geschmackstyp ab.
 * Methode: nächster Prototyp (gewichtete Distanz) – deterministisch und nachvollziehbar.
 */
import type { UserPreferenceKey, UserTasteProfile } from "@shared/taste-types.ts";

export const TASTE_TYPE_IDS = ["fruity", "fresh", "elegant", "bold", "sweet", "spicy"] as const;
export type TasteTypeId = (typeof TASTE_TYPE_IDS)[number];

export interface TasteType {
  id: TasteTypeId;
  name: string;
  tagline: string;
  /** Wonach SAN VINO für diesen Typ besonders sucht. */
  focus: string;
  prototype: Partial<Record<UserPreferenceKey, number>>;
}

export const TASTE_TYPES: Record<TasteTypeId, TasteType> = {
  fruity: {
    id: "fruity",
    name: "Der fruchtige Genießer",
    tagline: "Frucht zuerst – unkompliziert und zugänglich.",
    focus: "zugänglichen, fruchtbetonten Weinen",
    prototype: { fruitiness_preference: 85, sweetness_preference: 50, acidity_preference: 42, intensity_preference: 50, tannin_tolerance: 38 },
  },
  fresh: {
    id: "fresh",
    name: "Der frische Entdecker",
    tagline: "Leicht, lebendig und gerne spritzig.",
    focus: "frischen, leichten Weinen mit lebendiger Säure",
    prototype: { acidity_preference: 75, body_preference: 30, intensity_preference: 40, sweetness_preference: 35 },
  },
  elegant: {
    id: "elegant",
    name: "Der elegante Minimalist",
    tagline: "Trocken, ausgewogen und fein.",
    focus: "trockenen, ausgewogenen Weinen ohne Übertreibung",
    prototype: { sweetness_preference: 15, acidity_preference: 55, body_preference: 55, intensity_preference: 50, fruitiness_preference: 50 },
  },
  bold: {
    id: "bold",
    name: "Der kräftige Charakter",
    tagline: "Je mehr Tiefe, desto besser.",
    focus: "kräftigen, vollen Weinen mit Charakter",
    prototype: { body_preference: 82, intensity_preference: 85, tannin_tolerance: 70, spice_preference: 60 },
  },
  sweet: {
    id: "sweet",
    name: "Der süße Genießer",
    tagline: "Aromatisch, vollmundig und gern mit Süße.",
    focus: "aromatischen Weinen mit spürbarer Süße",
    prototype: { sweetness_preference: 80, fruitiness_preference: 80, acidity_preference: 35 },
  },
  spicy: {
    id: "spicy",
    name: "Der würzige Abenteurer",
    tagline: "Gewürze, Holz und spannende Aromen.",
    focus: "würzigen, vielschichtigen Weinen",
    prototype: { spice_preference: 78, oak_preference: 70, intensity_preference: 65, body_preference: 65 },
  },
};

export function determineTasteType(profile: UserTasteProfile): TasteType {
  let best: TasteType = TASTE_TYPES.fruity;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const id of TASTE_TYPE_IDS) {
    const type = TASTE_TYPES[id];
    const entries = Object.entries(type.prototype) as [UserPreferenceKey, number][];
    let sum = 0;
    let weights = 0;
    for (const [key, target] of entries) {
      const w = 0.5 + 0.5 * (profile.certainty?.[key] ?? 0.5);
      sum += w * (profile[key] - target) ** 2;
      weights += w;
    }
    const distance = Math.sqrt(sum / weights);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = type;
    }
  }
  return best;
}

export function getTasteType(id: string | null | undefined): TasteType | null {
  return id && id in TASTE_TYPES ? TASTE_TYPES[id as TasteTypeId] : null;
}
