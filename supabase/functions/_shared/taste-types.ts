/**
 * Gemeinsame Geschmacks-Datentypen für Frontend und Edge Functions.
 *
 * Skala aller numerischen Werte: 0–100.
 *   Nutzerprofil:  0 = möglichst geringe Ausprägung gewünscht / toleriert,
 *                100 = sehr hohe Ausprägung gewünscht / toleriert.
 *   Weinprofil:    0 = Merkmal praktisch nicht vorhanden,
 *                100 = Merkmal sehr stark ausgeprägt.
 *
 * Diese Datei darf keine Abhängigkeiten zu Browser- oder Deno-APIs haben.
 */

export const WINE_DIMENSIONS = [
  "sweetness",
  "acidity",
  "body",
  "tannins",
  "fruitiness",
  "oak",
  "spice",
  "intensity",
] as const;
export type WineDimension = (typeof WINE_DIMENSIONS)[number];

export const WINE_TYPES = ["red", "white", "rose", "sparkling", "sweet", "orange", "other", "unknown"] as const;
export type WineType = (typeof WINE_TYPES)[number];

/** Weinarten, die ein Nutzer im Onboarding bevorzugen kann. */
export const PREFERABLE_WINE_TYPES = ["red", "white", "rose", "sparkling"] as const;
export type PreferableWineType = (typeof PREFERABLE_WINE_TYPES)[number];

export const FRUIT_NOTES = [
  "strawberry",
  "cherry",
  "raspberry",
  "red_berries",
  "citrus",
  "peach",
  "apricot",
  "tropical",
  "blackberry",
  "dark_fruit",
] as const;
export type FruitNote = (typeof FRUIT_NOTES)[number];

export type ProfileConfidence = "initial" | "learning" | "established";

/** Wie belastbar ein Wert im Nutzerprofil ist (0 = geraten, 1 = direkt erfragt). */
export type DimensionCertainty = Record<UserPreferenceKey, number>;

export interface UserTasteProfile {
  sweetness_preference: number;
  acidity_preference: number;
  body_preference: number;
  tannin_tolerance: number;
  bitterness_tolerance: number;
  fruitiness_preference: number;
  oak_preference: number;
  spice_preference: number;
  intensity_preference: number;
  preferred_wine_types: PreferableWineType[];
  preferred_fruit_notes: FruitNote[];
  certainty: DimensionCertainty;
  confidence: ProfileConfidence;
  /** Anzahl der Bewertungen, die in dieses Profil eingeflossen sind. */
  ratings_count: number;
}

export const USER_PREFERENCE_KEYS = [
  "sweetness_preference",
  "acidity_preference",
  "body_preference",
  "tannin_tolerance",
  "bitterness_tolerance",
  "fruitiness_preference",
  "oak_preference",
  "spice_preference",
  "intensity_preference",
] as const;
export type UserPreferenceKey = (typeof USER_PREFERENCE_KEYS)[number];

/** Zuordnung Weinmerkmal → passende Nutzerpräferenz. */
export const DIMENSION_TO_PREFERENCE: Record<WineDimension, UserPreferenceKey> = {
  sweetness: "sweetness_preference",
  acidity: "acidity_preference",
  body: "body_preference",
  tannins: "tannin_tolerance",
  fruitiness: "fruitiness_preference",
  oak: "oak_preference",
  spice: "spice_preference",
  intensity: "intensity_preference",
};

/**
 * Herkunft einer Weineigenschaft:
 *  - knowledge:      aus gesichertem Wissen über diesen konkreten Wein / diese Rebsorte & Region
 *  - style_estimate: grobe Schätzung aus dem Weinstil
 *  - unknown:        nicht bestimmbar
 */
export type PropertySource = "knowledge" | "style_estimate" | "unknown";

export interface WineProperty {
  value: number | null;
  source: PropertySource;
}

export type WineTasteProperties = Record<WineDimension, WineProperty>;

/** Herkunft einer erkannten Faktenangabe. */
export type EvidenceKind = "visible" | "inferred" | "unknown";
