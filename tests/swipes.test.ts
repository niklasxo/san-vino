import { describe, expect, it } from "vitest";
import { applySwipes, MAX_SWIPE_SHIFT, openSwipeQuestions, SWIPE_QUESTIONS, type SwipeAnswers } from "@/lib/taste-profile/swipes";
import { recommendStyles, WINE_STYLES } from "@/lib/wine-styles";
import { DRY_BOLD_ANSWERS, FRESH_ANSWERS, profileFrom } from "./helpers";

const fresh = profileFrom(FRESH_ANSWERS);

describe("Geschmack verfeinern (Swipes)", () => {
  it("hat 50 eindeutige Fragen, deren Schlüssel die Datenbank akzeptiert", () => {
    expect(SWIPE_QUESTIONS).toHaveLength(50);
    expect(new Set(SWIPE_QUESTIONS.map((q) => q.key)).size).toBe(50);
    for (const q of SWIPE_QUESTIONS) expect(q.key).toMatch(/^s[0-9]{2}_[a-z_]+$/);
  });

  it("„Ja“ verschiebt voll, „Nein“ abgeschwächt in Gegenrichtung, „Weiß nicht“ gar nicht", () => {
    const yes = applySwipes(fresh, { s01_sweets: "yes" });
    const no = applySwipes(fresh, { s01_sweets: "no" });
    const unsure = applySwipes(fresh, { s01_sweets: "unsure" });
    expect(yes.sweetness_preference).toBe(Math.min(100, fresh.sweetness_preference + 5));
    expect(no.sweetness_preference).toBe(Math.max(0, fresh.sweetness_preference - 3));
    expect(unsure).toEqual(fresh);
  });

  it("begrenzt die Gesamtverschiebung pro Merkmal", () => {
    const allSweetYes: SwipeAnswers = Object.fromEntries(
      SWIPE_QUESTIONS.filter((q) => (q.effect.sweetness_preference ?? 0) > 0).map((q) => [q.key, "yes"]),
    );
    const after = applySwipes(fresh, allSweetYes);
    expect(after.sweetness_preference - fresh.sweetness_preference).toBeLessThanOrEqual(MAX_SWIPE_SHIFT);
  });

  it("erhöht die Sicherheit betroffener Merkmale (nie senken) und ergänzt Fruchtnoten", () => {
    const low = { ...fresh, certainty: { ...fresh.certainty, acidity_preference: 0.5, sweetness_preference: 1 } };
    const after = applySwipes(low, { s06_sour_candy: "yes", s01_sweets: "yes", s49_raspberries: "yes" });
    expect(after.certainty.acidity_preference).toBeGreaterThan(0.5);
    expect(after.certainty.sweetness_preference).toBe(1);
    expect(after.preferred_fruit_notes).toContain("raspberry");
  });

  it("ist unabhängig von der Reihenfolge der Antworten", () => {
    const a = applySwipes(fresh, { s01_sweets: "yes", s14_spicy_food: "no", s24_whisky: "yes" });
    const b = applySwipes(fresh, { s24_whisky: "yes", s01_sweets: "yes", s14_spicy_food: "no" });
    expect(a).toEqual(b);
  });

  it("zeigt nur noch offene Fragen", () => {
    expect(openSwipeQuestions({ s01_sweets: "yes", s02_dark_chocolate: "unsure" })).toHaveLength(48);
  });
});

describe("Mein Wein (Empfehlung ohne Karte)", () => {
  it("bewertet alle Stile und sortiert die beste Passung nach vorn", () => {
    const recs = recommendStyles(fresh);
    expect(recs).toHaveLength(WINE_STYLES.length);
    for (let i = 1; i < recs.length; i++) expect(recs[i - 1].match.score).toBeGreaterThanOrEqual(recs[i].match.score);
    expect(recs.every((r) => r.match.confidence !== "insufficient")).toBe(true);
  });

  it("frischer Geschmack → frischer Weißwein vorn, kräftig-trocken → kräftiger Rotwein vorn", () => {
    const freshTop = recommendStyles(fresh).slice(0, 3).map((r) => r.style.type);
    expect(freshTop.some((t) => t === "white" || t === "sparkling" || t === "rose")).toBe(true);
    const boldTop = recommendStyles(profileFrom(DRY_BOLD_ANSWERS))[0];
    expect(boldTop.style.type).toBe("red");
  });

  it("Swipes verändern die Empfehlung spürbar", () => {
    const sweetLover: SwipeAnswers = Object.fromEntries(
      SWIPE_QUESTIONS.filter((q) => (q.effect.sweetness_preference ?? 0) > 0).map((q) => [q.key, "yes"]),
    );
    const before = recommendStyles(fresh).find((r) => r.style.id === "moscato_asti")!.match.score;
    const after = recommendStyles(applySwipes(fresh, sweetLover)).find((r) => r.style.id === "moscato_asti")!.match.score;
    expect(after).toBeGreaterThan(before);
  });
});
