import { describe, expect, it } from "vitest";
import { computeMatch, dimensionSimilarity, MATCH_WEIGHTS, matchCategory } from "@shared/matching.ts";
import { demoWine, DEMO_MENU, DEMO_PRIMITIVO, DEMO_RIESLING, DEMO_UNCERTAIN } from "@/demo/fixtures";
import { rankItems, shortReason } from "@/lib/matching";
import type { ScanItem } from "@/types/domain";
import { DRY_BOLD_ANSWERS, FRESH_ANSWERS, FRUITY_SWEET_ANSWERS, profileFrom } from "./helpers";

const fruity = profileFrom(FRUITY_SWEET_ANSWERS);
const bold = profileFrom(DRY_BOLD_ANSWERS);
const fresh = profileFrom(FRESH_ANSWERS);

const BAROLO = DEMO_MENU.find((w) => w.name?.startsWith("Barolo"))!;
const SAUVIGNON = DEMO_MENU.find((w) => w.name === "Sauvignon Blanc")!;

describe("Matching", () => {
  it("Gewichte summieren sich zu 100 %", () => {
    expect(Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it("gibt passenden Weinen hohe Werte", () => {
    const m = computeMatch(fruity, DEMO_PRIMITIVO);
    expect(m.score).toBeGreaterThanOrEqual(70);
    expect(m.confidence).toBe("high");
    expect(computeMatch(fresh, DEMO_RIESLING).score).toBeGreaterThanOrEqual(80);
  });

  it("gibt unpassenden Weinen niedrige Werte", () => {
    expect(computeMatch(fruity, BAROLO).score).toBeLessThan(55);
    expect(computeMatch(bold, DEMO_RIESLING).score).toBeLessThan(55);
    expect(computeMatch(fresh, BAROLO).score).toBeLessThan(computeMatch(fresh, SAUVIGNON).score);
  });

  it("bewertet nicht nach Preis oder Prestige", () => {
    const cheap = { ...DEMO_PRIMITIVO, price: 5 };
    const pricey = { ...BAROLO, price: 200 };
    expect(computeMatch(fruity, cheap).score).toBeGreaterThan(computeMatch(fruity, pricey).score);
  });

  it("ist deterministisch", () => {
    expect(computeMatch(bold, BAROLO)).toEqual(computeMatch(bold, BAROLO));
  });

  it("wertet unbekannte Merkmale nicht als neutral, sondern lässt sie weg", () => {
    const m = computeMatch(fruity, DEMO_UNCERTAIN);
    expect(m.breakdown.map((b) => b.dimension).sort()).toEqual(["body", "fruitiness"]);
    expect(m.confidence).toBe("insufficient");
    expect(matchCategory(m)).toBe("uncertain");
    // Ein Wein ohne jede Info darf nicht wie ein "50 %"-Wein behandelt werden
    const empty = demoWine({ name: "X", type: "unknown", confidence: 0.9, props: {} });
    const e = computeMatch(fruity, empty);
    expect(e.coverage).toBe(0);
    expect(e.confidence).toBe("insufficient");
  });

  it("reduziert die Zuverlässigkeit bei geschätzten Merkmalen und unsicherer Identifikation", () => {
    const estimated = { ...DEMO_PRIMITIVO, taste_properties: Object.fromEntries(Object.entries(DEMO_PRIMITIVO.taste_properties).map(([k, v]) => [k, { ...v, source: "style_estimate" as const }])) as typeof DEMO_PRIMITIVO.taste_properties };
    const sure = computeMatch(fruity, DEMO_PRIMITIVO);
    const est = computeMatch(fruity, estimated);
    const unsureId = computeMatch(fruity, { ...DEMO_PRIMITIVO, identification_confidence: 0.35 });
    expect(est.reliability).toBeLessThan(sure.reliability);
    expect(unsureId.reliability).toBeLessThan(sure.reliability);
  });

  it("verarbeitet Extremwerte stabil", () => {
    const extremeUser = { ...fruity, sweetness_preference: 100, acidity_preference: 0, body_preference: 100, tannin_tolerance: 0, fruitiness_preference: 100, oak_preference: 0, spice_preference: 0, intensity_preference: 100 };
    const extremeWine = demoWine({ name: "Extrem", type: "red", confidence: 1, props: { sweetness: 0, acidity: 100, body: 0, tannins: 100, fruitiness: 0, oak: 100, spice: 100, intensity: 0 } });
    const m = computeMatch(extremeUser, extremeWine);
    expect(m.score).toBeGreaterThanOrEqual(0);
    expect(m.score).toBeLessThanOrEqual(10);
    const perfect = demoWine({ name: "Perfekt", type: "red", confidence: 1, props: { sweetness: 100, acidity: 0, body: 100, tannins: 0, fruitiness: 100, oak: 0, spice: 0, intensity: 100 } });
    expect(computeMatch(extremeUser, perfect).score).toBeGreaterThanOrEqual(95);
    expect(Number.isFinite(computeMatch(extremeUser, { ...perfect, identification_confidence: 0 }).score)).toBe(true);
  });

  it("modelliert Tannine als Toleranz: weniger Herbe als toleriert kostet kaum", () => {
    expect(dimensionSimilarity("tolerance", 70, 20)).toBeGreaterThan(0.85);
    expect(dimensionSimilarity("tolerance", 20, 80)).toBeLessThan(0.2);
  });

  it("bevorzugte Weinarten verschieben nur leicht und schließen nichts aus", () => {
    const redOnly = { ...fresh, preferred_wine_types: ["red" as const] };
    const open = { ...fresh, preferred_wine_types: [] };
    const diff = computeMatch(open, DEMO_RIESLING).score - computeMatch(redOnly, DEMO_RIESLING).score;
    expect(diff).toBeGreaterThan(0);
    expect(diff).toBeLessThanOrEqual(6);
    expect(computeMatch(redOnly, DEMO_RIESLING).score).toBeGreaterThan(60);
  });

  it("sortiert Weinkarten nach Passung, unsichere ans Ende", () => {
    const items = DEMO_MENU.map((w, i) => ({ id: `i${i}`, position: i, extracted_data: w }) as unknown as ScanItem);
    const ranked = rankItems(items, fruity);
    const scores = ranked.filter((r) => r.match.confidence !== "insufficient").map((r) => r.match.rankScore);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    expect(ranked[ranked.length - 1].item.extracted_data.name).toBe("Hauswein rot");
  });

  it("formuliert Kurzbegründungen ohne Widerspruch zur Abweichung", () => {
    const m = computeMatch(fruity, BAROLO);
    expect(shortReason(m, BAROLO)).toMatch(/als du es magst|als dein/);
    expect(shortReason(computeMatch(fruity, DEMO_UNCERTAIN), DEMO_UNCERTAIN)).toMatch(/Zu wenig Infos/);
  });
});
