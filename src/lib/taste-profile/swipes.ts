/**
 * „Geschmack verfeinern“: 50 Alltagsfragen, Antwort per Wischen (Ja / Nein / Weiß nicht).
 *
 * Jede Frage wirkt mit kleinen, festen Schritten auf einzelne Profilmerkmale. Grundsätze:
 *  - „Ja“ wendet die Wirkung voll an, „Nein“ abgeschwächt in Gegenrichtung (NO_FACTOR),
 *    „Weiß nicht“ ändert nichts.
 *  - Die Summe aller Swipes verschiebt ein Merkmal um höchstens MAX_SWIPE_SHIFT Punkte –
 *    50 Fragen können die 10 Onboarding-Fragen verfeinern, aber nicht umwerfen.
 *  - Fruchtnoten und Weinarten werden nur ergänzt, nie entfernt.
 *  - Reine Funktion, reihenfolgeunabhängig: Profil = Onboarding → Swipes → Bewertungen.
 */
import type { FruitNote, PreferableWineType, UserPreferenceKey, UserTasteProfile } from "@shared/taste-types.ts";

export const MAX_SWIPE_SHIFT = 15;
const NO_FACTOR = 0.6;
const CERTAINTY_STEP = 0.02;
const MAX_CERTAINTY_GAIN = 0.15;

export type SwipeAnswer = "yes" | "no" | "unsure";
export type SwipeAnswers = Record<string, SwipeAnswer>;

export interface SwipeQuestion {
  key: string;
  text: string;
  emoji: string;
  effect: Partial<Record<UserPreferenceKey, number>>;
  /** Bei „Ja“ als bevorzugte Fruchtnote ergänzen. */
  fruit?: FruitNote;
  /** Bei „Ja“ als bevorzugte Weinart ergänzen. */
  wineType?: PreferableWineType;
}

const q = (key: string, emoji: string, text: string, effect: SwipeQuestion["effect"], extra: Partial<SwipeQuestion> = {}): SwipeQuestion => ({
  key,
  emoji,
  text,
  effect,
  ...extra,
});

export const SWIPE_QUESTIONS: SwipeQuestion[] = [
  q("s01_sweets", "🍬", "Magst du Süßigkeiten?", { sweetness_preference: 5 }),
  q("s02_dark_chocolate", "🍫", "Magst du Zartbitterschokolade?", { bitterness_tolerance: 5, tannin_tolerance: 3 }),
  q("s03_black_coffee", "☕", "Trinkst du Kaffee gern schwarz, ohne Zucker?", { bitterness_tolerance: 5, tannin_tolerance: 3 }),
  q("s04_bitter_beer", "🍺", "Magst du herbes Bier wie ein Pils?", { bitterness_tolerance: 4 }),
  q("s05_beef_fillet", "🥩", "Magst du ein saftiges Rinderfilet oder Steak?", { body_preference: 4, tannin_tolerance: 4, intensity_preference: 3 }),
  q("s06_sour_candy", "🍋", "Magst du saure Gummibärchen?", { acidity_preference: 5 }),
  q("s07_grapefruit", "🍊", "Magst du Grapefruit?", { acidity_preference: 3, bitterness_tolerance: 3 }),
  q("s08_strawberries", "🍓", "Magst du Erdbeeren besonders gern?", { fruitiness_preference: 3 }, { fruit: "strawberry" }),
  q("s09_cherries", "🍒", "Magst du Kirschen?", { fruitiness_preference: 3 }, { fruit: "cherry" }),
  q("s10_peach", "🍑", "Magst du Pfirsiche oder Aprikosen?", { fruitiness_preference: 2 }, { fruit: "peach" }),
  q("s11_blackberries", "🫐", "Magst du Brombeeren und Heidelbeeren?", { fruitiness_preference: 2 }, { fruit: "blackberry" }),
  q("s12_tropical", "🥭", "Magst du Mango, Ananas oder Maracuja?", { fruitiness_preference: 3, sweetness_preference: 1 }, { fruit: "tropical" }),
  q("s13_citrus", "🍋", "Magst du Zitrusfrüchte wie Zitrone und Limette?", { acidity_preference: 3 }, { fruit: "citrus" }),
  q("s14_spicy_food", "🌶️", "Isst du gern scharf?", { spice_preference: 5, intensity_preference: 2 }),
  q("s15_pepper", "🧂", "Magst du kräftig gewürztes Essen mit viel Pfeffer?", { spice_preference: 4 }),
  q("s16_vanilla", "🍦", "Magst du Vanille – im Eis, im Pudding, überall?", { oak_preference: 4, sweetness_preference: 1 }),
  q("s17_smoky_bbq", "🔥", "Magst du rauchige Aromen wie vom Grill?", { oak_preference: 4, intensity_preference: 3 }),
  q("s18_espresso", "☕", "Ist ein starker Espresso genau dein Ding?", { intensity_preference: 3, bitterness_tolerance: 3 }),
  q("s19_cola", "🥤", "Trinkst du gern süße Limo oder Cola?", { sweetness_preference: 3 }),
  q("s20_sparkling_water", "🫧", "Magst du Getränke mit viel Kohlensäure?", { acidity_preference: 2 }, { wineType: "sparkling" }),
  q("s21_spritz", "🍹", "Magst du einen Aperol Spritz oder Hugo?", { sweetness_preference: 2, fruitiness_preference: 2 }, { wineType: "sparkling" }),
  q("s22_gin_tonic", "🍸", "Magst du Gin Tonic?", { bitterness_tolerance: 3, acidity_preference: 2 }),
  q("s23_sweet_cocktails", "🍍", "Magst du süße Cocktails wie Piña Colada?", { sweetness_preference: 4, fruitiness_preference: 3 }),
  q("s24_whisky", "🥃", "Magst du Whisky oder Rum aus dem Holzfass?", { oak_preference: 5, intensity_preference: 4 }),
  q("s25_strong_cheese", "🧀", "Magst du kräftigen Käse wie Parmesan oder Bergkäse?", { intensity_preference: 3, body_preference: 3, tannin_tolerance: 2 }),
  q("s26_creamy_cheese", "🧈", "Magst du cremigen Käse wie Brie?", { body_preference: 3, oak_preference: 2 }),
  q("s27_seafood", "🦐", "Isst du gern Fisch und Meeresfrüchte?", { acidity_preference: 3, body_preference: -2 }),
  q("s28_vinaigrette", "🥗", "Magst du Salat mit säuerlichem Essig-Dressing?", { acidity_preference: 3 }),
  q("s29_tomatoes", "🍅", "Magst du frische Tomaten?", { acidity_preference: 2 }),
  q("s30_pickles", "🥒", "Magst du saure Gurken oder Sauerkraut?", { acidity_preference: 3 }),
  q("s31_rhubarb", "🌱", "Magst du Rhabarber?", { acidity_preference: 3 }),
  q("s32_honey", "🍯", "Magst du Honig?", { sweetness_preference: 4 }),
  q("s33_dried_fruit", "🍇", "Magst du Rosinen, Datteln oder Feigen?", { sweetness_preference: 3, intensity_preference: 2 }, { fruit: "dark_fruit" }),
  q("s34_plums", "🫐", "Magst du Pflaumen oder Pflaumenkuchen?", { body_preference: 2, fruitiness_preference: 2 }, { fruit: "dark_fruit" }),
  q("s35_green_tea", "🍵", "Magst du grünen Tee, auch wenn er etwas herb ist?", { tannin_tolerance: 4, bitterness_tolerance: 2 }),
  q("s36_black_tea", "🫖", "Trinkst du gern kräftigen Schwarztee?", { tannin_tolerance: 4 }),
  q("s37_walnuts", "🌰", "Magst du Walnüsse?", { tannin_tolerance: 3 }),
  q("s38_mushrooms", "🍄", "Magst du Pilze und erdige Aromen wie Trüffel?", { fruitiness_preference: -3, intensity_preference: 2 }),
  q("s39_liquorice", "🖤", "Magst du Lakritz?", { spice_preference: 3, bitterness_tolerance: 2, intensity_preference: 2 }),
  q("s40_cinnamon", "🎄", "Magst du Zimt, Nelken und Glühwein-Gewürze?", { spice_preference: 4 }),
  q("s41_ginger", "🫚", "Magst du Ingwer?", { spice_preference: 3, acidity_preference: 1 }),
  q("s42_spritzer", "🧃", "Trinkst du im Sommer am liebsten leichte Schorlen?", { body_preference: -3, intensity_preference: -3, acidity_preference: 2 }),
  q("s43_cream_sauce", "🍝", "Magst du Sahnesoßen und Butter?", { body_preference: 4, oak_preference: 2 }),
  q("s44_game_lamb", "🍖", "Magst du Wild oder Lamm?", { intensity_preference: 4, tannin_tolerance: 3, body_preference: 3 }),
  q("s45_sushi", "🍣", "Magst du Sushi?", { acidity_preference: 2, body_preference: -2 }),
  q("s46_tomato_pasta", "🍕", "Ist Pizza oder Pasta mit Tomatensoße dein Lieblingsessen?", { acidity_preference: 2, fruitiness_preference: 1, tannin_tolerance: 1 }),
  q("s47_rich_desserts", "🍰", "Magst du richtig süße Desserts wie Tiramisu?", { sweetness_preference: 4 }),
  q("s48_sour_apples", "🍏", "Magst du saure Äpfel wie Granny Smith?", { acidity_preference: 4 }),
  q("s49_raspberries", "🍇", "Magst du Himbeeren?", { fruitiness_preference: 2 }, { fruit: "raspberry" }),
  q("s50_gingerbread", "🍪", "Magst du Lebkuchen und Spekulatius?", { spice_preference: 3, sweetness_preference: 2, oak_preference: 2 }),
];

const byKey = new Map(SWIPE_QUESTIONS.map((x) => [x.key, x]));
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Wendet alle Swipe-Antworten auf ein Profil an (Ergebnis dient als Basis für das Lernen aus Bewertungen). */
export function applySwipes(base: UserTasteProfile, answers: SwipeAnswers): UserTasteProfile {
  const shifts: Partial<Record<UserPreferenceKey, number>> = {};
  const touched: Partial<Record<UserPreferenceKey, number>> = {};
  const fruits = new Set(base.preferred_fruit_notes);
  const types = new Set(base.preferred_wine_types);

  for (const [key, answer] of Object.entries(answers)) {
    const question = byKey.get(key);
    if (!question || answer === "unsure") continue;
    const factor = answer === "yes" ? 1 : -NO_FACTOR;
    for (const [pref, value] of Object.entries(question.effect) as [UserPreferenceKey, number][]) {
      shifts[pref] = (shifts[pref] ?? 0) + value * factor;
      touched[pref] = (touched[pref] ?? 0) + 1;
    }
    if (answer === "yes" && question.fruit) fruits.add(question.fruit);
    // Weinarten nur ergänzen, wenn überhaupt welche bevorzugt werden (leere Liste = „alle offen“).
    if (answer === "yes" && question.wineType && types.size > 0) types.add(question.wineType);
  }

  const next: UserTasteProfile = {
    ...base,
    certainty: { ...base.certainty },
    preferred_fruit_notes: [...fruits],
    preferred_wine_types: [...types],
  };
  for (const [pref, shift] of Object.entries(shifts) as [UserPreferenceKey, number][]) {
    next[pref] = Math.round(clamp(base[pref] + clamp(shift, -MAX_SWIPE_SHIFT, MAX_SWIPE_SHIFT), 0, 100));
    const gain = Math.min(MAX_CERTAINTY_GAIN, CERTAINTY_STEP * (touched[pref] ?? 0));
    // Sicherheit steigt nur – direkt erfragte Werte (bis 1,0) bleiben unangetastet.
    const raised = Math.min(0.95, base.certainty[pref] + gain);
    next.certainty[pref] = Math.max(base.certainty[pref], Math.round(raised * 100) / 100);
  }
  return next;
}

/** Noch offene Fragen zuerst, in fester Reihenfolge. */
export function openSwipeQuestions(answers: SwipeAnswers): SwipeQuestion[] {
  return SWIPE_QUESTIONS.filter((x) => !(x.key in answers));
}
