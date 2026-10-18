import { describe, expect, it } from "vitest";
import { DEMO_MENU, DEMO_PRIMITIVO, DEMO_UNCERTAIN, demoWine } from "@/demo/fixtures";
import { MAX_STEP, MAX_TOTAL_SHIFT, type RatingForLearning, rebuildLearnedProfile, sentiment } from "@/lib/taste-profile/learning";
import { DRY_BOLD_ANSWERS, FRESH_ANSWERS, profileFrom } from "./helpers";

const rating = (wine: RatingForLearning["wine"], r: Partial<RatingForLearning> = {}): RatingForLearning => ({
  verdict: "loved",
  rating: null,
  liked_reasons: [],
  disliked_reasons: [],
  wine,
  ...r,
});

const fresh = profileFrom(FRESH_ANSWERS);
const softFruityRed = demoWine({ name: "Weicher Roter", type: "red", confidence: 0.9, props: { sweetness: 20, acidity: 40, body: 70, tannins: 35, fruitiness: 88, oak: 20, spice: 20, intensity: 70 } });

describe("Lernen aus Bewertungen", () => {
  it("ohne Bewertungen bleibt das Ausgangsprofil erhalten", () => {
    expect(rebuildLearnedProfile(fresh, [])).toEqual({ ...fresh, ratings_count: 0, confidence: "initial" });
  });

  it("eine einzelne Bewertung verändert das Profil nur begrenzt", () => {
    const after = rebuildLearnedProfile(fresh, [rating(softFruityRed, { rating: 5, liked_reasons: ["fruity", "strong"] })]);
    for (const k of ["body_preference", "intensity_preference", "fruitiness_preference", "acidity_preference"] as const) {
      expect(Math.abs(after[k] - fresh[k])).toBeLessThanOrEqual(MAX_STEP + 0.5);
    }
    expect(after.body_preference).toBeGreaterThan(fresh.body_preference);
    expect(after.confidence).toBe("learning");
  });

  it("übereinstimmende Bewertungen verstärken eine Präferenz – bis zur Obergrenze", () => {
    const one = rebuildLearnedProfile(fresh, [rating(softFruityRed)]);
    const three = rebuildLearnedProfile(fresh, [rating(softFruityRed), rating(softFruityRed), rating(softFruityRed)]);
    const many = rebuildLearnedProfile(fresh, Array.from({ length: 30 }, () => rating(softFruityRed, { rating: 5, liked_reasons: ["strong"] })));
    expect(three.body_preference - fresh.body_preference).toBeGreaterThan(one.body_preference - fresh.body_preference);
    expect(many.body_preference - fresh.body_preference).toBeLessThanOrEqual(MAX_TOTAL_SHIFT);
    expect(many.confidence).toBe("established");
  });

  it("widersprüchliche Bewertungen führen zu kleineren Anpassungen", () => {
    const consistent = rebuildLearnedProfile(fresh, [rating(softFruityRed), rating(softFruityRed)]);
    const mixed = rebuildLearnedProfile(fresh, [rating(softFruityRed), rating(softFruityRed, { verdict: "disliked", disliked_reasons: ["too_strong"] })]);
    expect(Math.abs(mixed.body_preference - fresh.body_preference)).toBeLessThan(Math.abs(consistent.body_preference - fresh.body_preference));
  });

  it("unbekannte Weinmerkmale verändern das Profil nicht", () => {
    const after = rebuildLearnedProfile(fresh, [rating(DEMO_UNCERTAIN, { disliked_reasons: ["too_sour", "too_sweet"], verdict: "disliked" })]);
    expect(after.acidity_preference).toBe(fresh.acidity_preference);
    expect(after.sweetness_preference).toBe(fresh.sweetness_preference);
    expect(after.tannin_tolerance).toBe(fresh.tannin_tolerance);
  });

  it("gezielte Gründe korrigieren in die richtige Richtung", () => {
    const bold = profileFrom(DRY_BOLD_ANSWERS);
    const barolo = DEMO_MENU.find((w) => w.name?.startsWith("Barolo"))!;
    const after = rebuildLearnedProfile(bold, [rating(barolo, { verdict: "disliked", disliked_reasons: ["too_bitter", "too_sour"] })]);
    expect(after.tannin_tolerance).toBeLessThan(bold.tannin_tolerance);
    expect(after.bitterness_tolerance).toBeLessThan(bold.bitterness_tolerance);
    expect(after.acidity_preference).toBeLessThan(bold.acidity_preference);
  });

  it("ist reihenfolgeunabhängig und das Ausgangsprofil bleibt rekonstruierbar", () => {
    const a = rating(softFruityRed);
    const b = rating(DEMO_PRIMITIVO, { verdict: "okay", disliked_reasons: ["too_strong"] });
    expect(rebuildLearnedProfile(fresh, [a, b])).toEqual(rebuildLearnedProfile(fresh, [b, a]));
    expect(rebuildLearnedProfile(fresh, [])).toMatchObject({ body_preference: fresh.body_preference });
  });

  it("ergänzt Weinarten nach mehrfacher Begeisterung, entfernt aber nie", () => {
    const after = rebuildLearnedProfile(fresh, [rating(softFruityRed), rating(softFruityRed)]);
    expect(after.preferred_wine_types).toEqual(expect.arrayContaining(["white", "red"]));
  });

  it("berechnet die Stimmung aus Urteil und Sternen", () => {
    expect(sentiment({ verdict: "loved", rating: null })).toBe(1);
    expect(sentiment({ verdict: null, rating: 1 })).toBe(-1);
    expect(sentiment({ verdict: "disliked", rating: 5 })).toBe(0);
  });
});
