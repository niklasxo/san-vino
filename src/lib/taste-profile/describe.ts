/** Verständliche, deutsche Beschreibungen des Geschmacksprofils. */
import type { PreferableWineType, UserPreferenceKey, UserTasteProfile, WineDimension, WineType } from "@shared/taste-types.ts";
import { determineTasteType } from "./taste-type";

export type Level = "low" | "medium" | "high";
export const LEVEL_LABEL: Record<Level, string> = { low: "Niedrig", medium: "Mittel", high: "Hoch" };

export function level(value: number): Level {
  if (value < 34) return "low";
  if (value <= 66) return "medium";
  return "high";
}

/** Merkmale, die im Profil visualisiert werden – in Alltagssprache. */
export const PROFILE_TRAITS: { key: UserPreferenceKey; label: string; low: string; high: string }[] = [
  { key: "fruitiness_preference", label: "Fruchtigkeit", low: "dezent", high: "fruchtig" },
  { key: "sweetness_preference", label: "Süße", low: "trocken", high: "süß" },
  { key: "acidity_preference", label: "Frische & Säure", low: "mild", high: "frisch" },
  { key: "intensity_preference", label: "Intensität", low: "leicht", high: "kräftig" },
  { key: "tannin_tolerance", label: "Herbe", low: "weich", high: "herb" },
  { key: "spice_preference", label: "Würze & Holz", low: "pur", high: "würzig" },
];

export const WINE_DIMENSION_LABEL: Record<WineDimension, string> = {
  fruitiness: "Fruchtig",
  sweetness: "Süße",
  acidity: "Säure",
  body: "Körper",
  tannins: "Herbe (Tannine)",
  intensity: "Intensität",
  oak: "Holz",
  spice: "Würze",
};

export const WINE_TYPE_LABEL: Record<WineType, string> = {
  red: "Rotwein",
  white: "Weißwein",
  rose: "Rosé",
  sparkling: "Schaumwein",
  sweet: "Süßwein",
  orange: "Orange Wine",
  other: "Wein",
  unknown: "Weinart unbekannt",
};

export const PREFERABLE_TYPE_LABEL: Record<PreferableWineType, string> = {
  red: "Rotwein",
  white: "Weißwein",
  rose: "Rosé",
  sparkling: "Schaumwein",
};

const join = (parts: string[]) =>
  parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} und ${parts[parts.length - 1]}`;

/** Zwei bis drei einfache Sätze über das Profil. */
export function describeProfile(p: UserTasteProfile): string {
  const likes: string[] = [];
  const dislikes: string[] = [];

  if (p.fruitiness_preference >= 62) likes.push("fruchtige");
  if (p.sweetness_preference >= 62) likes.push("leicht süße");
  if (p.sweetness_preference <= 30) likes.push("trockene");
  if (p.acidity_preference >= 62) likes.push("frische");
  if (p.acidity_preference <= 38 && p.tannin_tolerance <= 45) likes.push("eher weiche");
  if (p.intensity_preference >= 66) likes.push("kräftige");
  if (p.intensity_preference <= 32) likes.push("leichte");
  if (p.spice_preference >= 62) likes.push("würzige");
  if (likes.length === 0) likes.push("ausgewogene");

  if (p.sweetness_preference <= 40 && p.sweetness_preference > 20) dislikes.push("sehr süße");
  if (p.sweetness_preference >= 60) dislikes.push("sehr trockene");
  if (p.acidity_preference <= 35) dislikes.push("sehr saure");
  if (p.tannin_tolerance <= 35 || p.bitterness_tolerance <= 30) dislikes.push("herbe oder bittere");
  if (p.intensity_preference <= 35) dislikes.push("sehr kräftige");
  if (p.intensity_preference >= 72) dislikes.push("ganz leichte");
  if (p.oak_preference <= 25 && p.spice_preference <= 25) dislikes.push("stark holzige");

  const type = determineTasteType(p);
  const first = `Du magst ${join(likes.slice(0, 3))} Geschmäcker.`;
  const second = dislikes.length
    ? `${capitalize(join(dislikes.slice(0, 2)))} Weine könnten dir weniger gefallen.`
    : "Du bist ziemlich offen – das macht die Suche spannend.";
  const third = `Wir suchen deshalb besonders nach ${type.focus}.`;
  return `${first} ${second} ${third}`;
}

/** Kurzer, persönlicher Satz für den Home Screen. */
export function homeTagline(p: UserTasteProfile): string {
  const traits: string[] = [];
  if (p.fruitiness_preference >= 62) traits.push("fruchtig");
  if (p.sweetness_preference >= 62) traits.push("eher süß");
  else if (p.sweetness_preference <= 30) traits.push("trocken");
  if (p.acidity_preference >= 62) traits.push("frisch");
  else if (p.acidity_preference <= 38) traits.push("weich");
  if (p.intensity_preference >= 66) traits.push("kräftig");
  else if (p.intensity_preference <= 32) traits.push("leicht");
  if (traits.length === 0) traits.push("ausgewogen");
  return `Du magst es ${join(traits.slice(0, 2))}. Finden wir den perfekten Wein für dich.`;
}

export type ProfileCertainty = { label: string; description: string; progress: number };

export function profileCertainty(p: UserTasteProfile): ProfileCertainty {
  const n = p.ratings_count ?? 0;
  if (n === 0)
    return {
      label: "Erster Eindruck",
      description: "Dein Profil basiert auf deinen Antworten. Mit jeder Bewertung lernen wir dich besser kennen.",
      progress: 0.25,
    };
  if (n < 5)
    return {
      label: "Wird genauer",
      description: `${n} ${n === 1 ? "Bewertung fließt" : "Bewertungen fließen"} schon ein. Ab fünf Bewertungen wird es richtig persönlich.`,
      progress: 0.25 + n * 0.12,
    };
  return {
    label: "Gut eingespielt",
    description: `${n} Bewertungen machen deine Empfehlungen deutlich persönlicher.`,
    progress: Math.min(1, 0.85 + (n - 5) * 0.02),
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
