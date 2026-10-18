/**
 * Regelbasierte, kostenlose Kurzbegründungen aus dem Matching-Ergebnis.
 * Werden auf Karten angezeigt (ohne KI-Aufruf) und im Demo-Modus als Erklärung genutzt.
 */
import { type DimensionBreakdown, matchCategory, type MatchResult } from "@shared/matching.ts";
import type { WineDimension } from "@shared/taste-types.ts";
import type { ExtractedWine } from "@shared/wine-schema.ts";
import type { StoredExplanation } from "@/types/domain";

function trait(dim: WineDimension, value: number, type?: string): string | null {
  switch (dim) {
    case "fruitiness": return value >= 60 ? "fruchtig" : null;
    case "sweetness": return value >= 45 ? "lieblich" : value <= 20 ? "trocken" : null;
    case "acidity": return value >= 65 ? "frisch" : value <= 40 ? "mild" : null;
    case "body": return value >= 68 ? "kräftig" : value <= 35 ? "leicht" : null;
    // „weich“ ist nur bei Rotwein eine sinnvolle Aussage über geringe Herbe.
    case "tannins": return type === "red" ? (value <= 35 ? "weich" : value >= 70 ? "herb" : null) : null;
    case "oak": return value >= 55 ? "mit Holznote" : null;
    case "spice": return value >= 55 ? "würzig" : null;
    case "intensity": return value >= 70 ? "intensiv" : value <= 35 ? "dezent" : null;
  }
}

function mismatch(b: DimensionBreakdown): string {
  const more = b.direction > 0;
  switch (b.dimension) {
    case "sweetness": return more ? "süßer als du es magst" : "trockener als du es magst";
    case "acidity": return more ? "deutlich frischer und säuerlicher als dein Stil" : "weniger frisch als du es magst";
    case "body": return more ? "schwerer als du es magst" : "leichter als du es magst";
    case "tannins": return "herber als du es magst";
    case "fruitiness": return more ? "fruchtiger als nötig" : "weniger fruchtig als du es magst";
    case "oak": return more ? "holziger als dein Geschmack" : "ohne die Holznote, die du magst";
    case "spice": return more ? "würziger als du es magst" : "weniger würzig als du es magst";
    case "intensity": return more ? "intensiver als du es magst" : "dezenter als du es magst";
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const joinAnd = (p: string[]) => (p.length <= 1 ? (p[0] ?? "") : `${p.slice(0, -1).join(", ")} und ${p[p.length - 1]}`);

/** Typische Eigenschaften eines Weins in Worten, z. B. ["fruchtig", "kräftig"]. */
export function wineTraits(wine: ExtractedWine, limit = 3): string[] {
  const order: WineDimension[] = ["fruitiness", "sweetness", "body", "acidity", "tannins", "intensity", "spice", "oak"];
  const out: string[] = [];
  for (const dim of order) {
    const p = wine.taste_properties[dim];
    if (p.value == null) continue;
    const t = trait(dim, p.value, wine.wine_type);
    if (t && !out.includes(t)) out.push(t);
  }
  return out.slice(0, limit);
}

/** Eigenschaften, die gut zum Profil passen – nie solche, die gerade stören. */
function goodTraits(match: MatchResult, wine: ExtractedWine): string[] {
  return match.breakdown
    .filter((b) => b.similarity >= 0.8)
    .sort((a, b) => b.effectiveWeight * b.similarity - a.effectiveWeight * a.similarity)
    .map((b) => trait(b.dimension, b.wineValue, wine.wine_type))
    .filter((t): t is string => Boolean(t))
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .slice(0, 2);
}

function worstMismatches(match: MatchResult, n = 2): DimensionBreakdown[] {
  return match.breakdown.filter((b) => b.similarity < 0.7).sort((a, b) => a.similarity * a.effectiveWeight - b.similarity * b.effectiveWeight).slice(0, n);
}

export function shortReason(match: MatchResult, wine: ExtractedWine): string {
  const category = matchCategory(match);
  if (category === "uncertain") return "Zu wenig Infos für eine sichere Einschätzung.";
  const good = goodTraits(match, wine);
  const bad = worstMismatches(match, 1)[0];
  switch (category) {
    case "excellent":
      return good.length ? `${cap(joinAnd(good))} – genau dein Stil.` : "Passt richtig gut zu deinem Geschmack.";
    case "good":
      return good.length ? `${cap(joinAnd(good))} – könnte dir gut gefallen.` : "Könnte dir gut gefallen.";
    case "maybe":
      return bad ? `${good.length ? `${cap(good[0])}, aber` : "Vermutlich"} ${mismatch(bad)}.` : "Teilweise dein Stil.";
    case "unlikely":
      return bad ? `Vermutlich ${mismatch(bad)}.` : "Wahrscheinlich nicht ganz dein Geschmack.";
  }
}

export function likelyLikes(match: MatchResult, wine: ExtractedWine): string[] {
  const items = match.breakdown
    .filter((b) => b.similarity >= 0.85)
    .sort((a, b) => b.effectiveWeight - a.effectiveWeight)
    .map((b) => trait(b.dimension, b.wineValue, wine.wine_type))
    .filter((t): t is string => Boolean(t))
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .slice(0, 3)
    .map((t) => `Typischerweise ${t} – das passt zu deinen Vorlieben.`);
  if (wine.typical_notes.length && items.length < 3) items.push(`Häufig mit Noten von ${joinAnd(wine.typical_notes.slice(0, 3))}.`);
  return items;
}

export function likelyDislikes(match: MatchResult): string[] {
  return worstMismatches(match, 3).map((b) => `Könnte ${mismatch(b)} sein.`);
}

/** Vollständige, regelbasierte Erklärung (Demo-Modus). */
export function ruleBasedExplanation(match: MatchResult, wine: ExtractedWine, profileVersion: number): StoredExplanation {
  const category = matchCategory(match);
  const label = wine.grape_varieties[0] ?? wine.name ?? "Dieser Wein";
  const headline = {
    excellent: `${label} könnte genau dein Ding sein.`,
    good: `${label} könnte dir gut gefallen.`,
    maybe: `${label} ist vielleicht etwas für dich.`,
    unlikely: "Wahrscheinlich nicht ganz dein Geschmack.",
    uncertain: "Hier sind wir uns noch unsicher.",
  }[category];
  const traits = wineTraits(wine);
  const why =
    category === "uncertain"
      ? "Über diesen Wein wissen wir noch zu wenig, um ehrlich zu sagen, ob er zu dir passt. Ein Foto vom Etikett hilft uns weiter."
      : `Dieser Weinstil ist typischerweise ${joinAnd(traits.length ? traits : ["ausgewogen"])}. ${whyPersonal(match)}`;
  return {
    headline,
    summary_short: shortReason(match, wine),
    why,
    might_like: likelyLikes(match, wine),
    might_not_like: likelyDislikes(match),
    uncertainty_note: match.confidence === "high" ? null : "Ein Teil der Angaben ist geschätzt – nimm die Einschätzung als Tendenz.",
    score: match.score,
    category,
    profile_version: profileVersion,
    generated_at: new Date().toISOString(),
    demo: true,
  };
}

function whyPersonal(match: MatchResult): string {
  const bad = worstMismatches(match, 1)[0];
  const category = matchCategory(match);
  if (category === "excellent" || category === "good") {
    return bad ? `Das passt gut zu deinen Vorlieben – nur könnte er ${mismatch(bad)} sein.` : "Das passt sehr gut zu deinen Vorlieben.";
  }
  return bad ? `Er könnte allerdings ${mismatch(bad)} sein.` : "Teilweise passt das zu deinen Vorlieben.";
}
