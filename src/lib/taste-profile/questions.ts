/**
 * Die Geschmacksfragen. Kein Weinwissen nötig.
 * Im Onboarding werden nur die 6 aussagekräftigsten gestellt (ONBOARDING_KEYS); die übrigen bleiben
 * definiert, damit ältere gespeicherte Antworten weiter gelesen und berechnet werden können.
 * Feinere Einstellung (Würze, Holz …) übernehmen die optionalen Swipe-Fragen.
 * IDs sind stabil und werden in Supabase gespeichert – nicht umbenennen.
 */
export type QuestionKind = "single" | "multi";

export interface QuestionOption {
  id: string;
  label: string;
  hint?: string;
  emoji?: string;
}

export interface TasteQuestion {
  key: QuestionKey;
  kind: QuestionKind;
  title: string;
  helper?: string;
  options: QuestionOption[];
}

export const QUESTION_KEYS = [
  "q1_sweetness",
  "q2_acidity",
  "q3_fruits",
  "q4_intensity",
  "q5_bitterness",
  "q6_drinks",
  "q7_style",
  "q8_oak_spice",
  "q9_wine_type",
  "q10_description",
] as const;
export type QuestionKey = (typeof QUESTION_KEYS)[number];

export type TasteAnswers = Partial<Record<QuestionKey, string | string[]>>;

/** Die Fragen im Onboarding – Reihenfolge = Anzeigereihenfolge. */
export const ONBOARDING_KEYS = ["q1_sweetness", "q2_acidity", "q3_fruits", "q4_intensity", "q5_bitterness", "q9_wine_type"] as const;

const ALL_QUESTIONS: TasteQuestion[] = [
  {
    key: "q1_sweetness",
    kind: "single",
    title: "Wie süß magst du deine Getränke?",
    options: [
      { id: "very_sweet", label: "Am liebsten richtig süß", emoji: "🍯" },
      { id: "bit_sweet", label: "Ein bisschen süß ist perfekt", emoji: "🍑" },
      { id: "not_so_sweet", label: "Lieber nicht so süß", emoji: "🌿" },
      { id: "dry", label: "Möglichst trocken und wenig süß", emoji: "🪨" },
    ],
  },
  {
    key: "q2_acidity",
    kind: "single",
    title: "Wie stehst du zu sauren oder frischen Geschmäckern?",
    options: [
      { id: "love", label: "Ich liebe richtig saure Sachen", emoji: "🍋" },
      { id: "some", label: "Ein bisschen Säure finde ich gut", emoji: "🍏" },
      { id: "mild", label: "Lieber mild und ausgewogen", emoji: "🍐" },
      { id: "dislike", label: "Säure mag ich eher nicht", emoji: "🍌" },
    ],
  },
  {
    key: "q3_fruits",
    kind: "multi",
    title: "Welche Früchte magst du besonders gerne?",
    helper: "Wähle so viele, wie du magst.",
    options: [
      { id: "strawberry_cherry", label: "Erdbeeren und Kirschen", emoji: "🍒" },
      { id: "raspberry_red", label: "Himbeeren und rote Beeren", emoji: "🍓" },
      { id: "lemon_grapefruit", label: "Zitrone und Grapefruit", emoji: "🍋" },
      { id: "peach_apricot", label: "Pfirsich und Aprikose", emoji: "🍑" },
      { id: "mango_tropical", label: "Mango und tropische Früchte", emoji: "🥭" },
      { id: "blackberry_dark", label: "Brombeeren und dunkle Früchte", emoji: "🫐" },
    ],
  },
  {
    key: "q4_intensity",
    kind: "single",
    title: "Wie intensiv darf etwas schmecken?",
    options: [
      { id: "light", label: "Lieber leicht und dezent", emoji: "🪶" },
      { id: "balanced", label: "Frisch und ausgewogen", emoji: "⚖️" },
      { id: "intense", label: "Gerne intensiv", emoji: "🔥" },
      { id: "max", label: "Je kräftiger, desto besser", emoji: "💥" },
    ],
  },
  {
    key: "q5_bitterness",
    kind: "single",
    title: "Wie findest du bittere Geschmäcker?",
    helper: "Zum Beispiel dunkle Schokolade, Espresso oder Tonic Water.",
    options: [
      { id: "none", label: "Mag ich gar nicht", emoji: "🙅" },
      { id: "small", label: "In kleinen Mengen okay", emoji: "🤏" },
      { id: "like", label: "Mag ich gerne", emoji: "🍫" },
      { id: "love", label: "Ich liebe bittere Aromen", emoji: "☕" },
    ],
  },
  {
    key: "q6_drinks",
    kind: "multi",
    title: "Was trinkst du normalerweise am liebsten?",
    helper: "Mehrfachauswahl möglich.",
    options: [
      { id: "cocktails", label: "Fruchtige Cocktails", emoji: "🍹" },
      { id: "lemonade", label: "Spritzige Limonaden", emoji: "🫧" },
      { id: "coffee", label: "Kaffee oder Espresso", emoji: "☕" },
      { id: "tea", label: "Tee", emoji: "🍵" },
      { id: "beer", label: "Bier", emoji: "🍺" },
      { id: "sweet_drinks", label: "Süße Getränke", emoji: "🥤" },
      { id: "water", label: "Wasser und ungesüßte Getränke", emoji: "💧" },
    ],
  },
  {
    key: "q7_style",
    kind: "single",
    title: "Welche Geschmacksrichtung spricht dich am meisten an?",
    options: [
      { id: "fruity_sweet", label: "Fruchtig und süß", emoji: "🍓" },
      { id: "fresh_crisp", label: "Frisch und spritzig", emoji: "🍋" },
      { id: "mild_soft", label: "Mild und weich", emoji: "☁️" },
      { id: "strong_intense", label: "Kräftig und intensiv", emoji: "🔥" },
      { id: "spicy_interesting", label: "Würzig und interessant", emoji: "🌶️" },
    ],
  },
  {
    key: "q8_oak_spice",
    kind: "single",
    title: "Wie stehst du zu würzigen oder holzigen Aromen?",
    helper: "Zum Beispiel Vanille, Zimt, Gewürze oder Holznoten.",
    options: [
      { id: "none", label: "Mag ich gar nicht", emoji: "🙅" },
      { id: "sometimes", label: "Manchmal ganz angenehm", emoji: "🙂" },
      { id: "like", label: "Mag ich gerne", emoji: "🪵" },
      { id: "love", label: "Ich liebe solche Aromen", emoji: "✨" },
    ],
  },
  {
    key: "q9_wine_type",
    kind: "single",
    title: "Welche Weinart interessiert dich am meisten?",
    helper: "Keine Sorge – wir zeigen dir trotzdem alle Weine.",
    options: [
      { id: "red", label: "Rotwein", emoji: "🍷" },
      { id: "white", label: "Weißwein", emoji: "🥂" },
      { id: "rose", label: "Rosé", emoji: "🌸" },
      { id: "sparkling", label: "Schaumwein", emoji: "🍾" },
      { id: "open", label: "Ich bin für alles offen", emoji: "🌍" },
      { id: "unknown", label: "Ich weiß es noch nicht", emoji: "🤔" },
    ],
  },
  {
    key: "q10_description",
    kind: "single",
    title: "Welche Beschreibung klingt für dich am leckersten?",
    options: [
      { id: "fruity_soft", label: "„Fruchtig, weich und unkompliziert“" },
      { id: "fresh_light", label: "„Frisch, leicht und spritzig“" },
      { id: "dry_elegant", label: "„Trocken, elegant und ausgewogen“" },
      { id: "strong_spicy", label: "„Kräftig, würzig und intensiv“" },
      { id: "sweet_aromatic", label: "„Süß, aromatisch und vollmundig“" },
    ],
  },
];

export const QUESTIONS: TasteQuestion[] = ONBOARDING_KEYS.map((key) => ALL_QUESTIONS.find((q) => q.key === key)!);

export function isAnswered(q: TasteQuestion, answer: string | string[] | undefined): boolean {
  if (answer == null) return false;
  if (q.kind === "multi") return Array.isArray(answer) && answer.length > 0;
  return typeof answer === "string" && q.options.some((o) => o.id === answer);
}

export function isComplete(answers: TasteAnswers): boolean {
  return QUESTIONS.every((q) => isAnswered(q, answers[q.key]));
}
