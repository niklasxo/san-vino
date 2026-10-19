import { describe, expect, it } from "vitest";
import { USER_PREFERENCE_KEYS } from "@shared/taste-types.ts";
import { userTasteProfileSchema } from "@shared/profile-schema.ts";
import { computeTasteProfile } from "@/lib/taste-profile/compute";
import { describeProfile } from "@/lib/taste-profile/describe";
import { isComplete, QUESTIONS } from "@/lib/taste-profile/questions";
import { determineTasteType } from "@/lib/taste-profile/taste-type";
import { tasteAnswersSchema } from "@/lib/validation/answers";
import { DRY_BOLD_ANSWERS, FRESH_ANSWERS, FRUITY_SWEET_ANSWERS } from "./helpers";

describe("Fragebogen", () => {
  it("stellt im Onboarding genau sechs Fragen mit eindeutigen Schlüsseln", () => {
    expect(QUESTIONS).toHaveLength(6);
    expect(new Set(QUESTIONS.map((q) => q.key)).size).toBe(6);
  });
  it("erkennt vollständige und unvollständige Antworten", () => {
    expect(isComplete(FRUITY_SWEET_ANSWERS)).toBe(true);
    expect(isComplete({ ...FRUITY_SWEET_ANSWERS, q3_fruits: [] })).toBe(false);
    expect(tasteAnswersSchema.safeParse(FRUITY_SWEET_ANSWERS).success).toBe(true);
    expect(tasteAnswersSchema.safeParse({ ...FRUITY_SWEET_ANSWERS, q1_sweetness: "gibt_es_nicht" }).success).toBe(false);
  });
});

describe("computeTasteProfile", () => {
  it("rechnet die zehn Antworten in ein gültiges Profil (0–100) um", () => {
    const p = computeTasteProfile(FRUITY_SWEET_ANSWERS);
    expect(userTasteProfileSchema.safeParse(p).success).toBe(true);
    for (const k of USER_PREFERENCE_KEYS) {
      expect(p[k]).toBeGreaterThanOrEqual(0);
      expect(p[k]).toBeLessThanOrEqual(100);
    }
    expect(p.confidence).toBe("initial");
    expect(p.preferred_wine_types).toEqual(["red"]);
    expect(p.preferred_fruit_notes).toEqual(expect.arrayContaining(["cherry", "strawberry", "blackberry"]));
  });

  it("bildet direkte Vorlieben nachvollziehbar ab", () => {
    const sweet = computeTasteProfile(FRUITY_SWEET_ANSWERS);
    const dry = computeTasteProfile(DRY_BOLD_ANSWERS);
    expect(sweet.sweetness_preference).toBeGreaterThan(55);
    expect(dry.sweetness_preference).toBeLessThan(25);
    expect(dry.intensity_preference).toBeGreaterThan(75);
    expect(dry.tannin_tolerance).toBeGreaterThan(sweet.tannin_tolerance);
    expect(computeTasteProfile(FRESH_ANSWERS).acidity_preference).toBeGreaterThan(70);
  });

  it("ist deterministisch", () => {
    expect(computeTasteProfile(DRY_BOLD_ANSWERS)).toEqual(computeTasteProfile(DRY_BOLD_ANSWERS));
  });

  it("kennzeichnet indirekt abgeleitete Merkmale als unsicherer", () => {
    const p = computeTasteProfile(FRUITY_SWEET_ANSWERS);
    expect(p.certainty.sweetness_preference).toBeGreaterThan(p.certainty.tannin_tolerance);
  });

  it("belegt fehlende Antworten neutral mit niedriger Sicherheit vor", () => {
    const p = computeTasteProfile({});
    for (const k of USER_PREFERENCE_KEYS) {
      expect(p[k]).toBe(50);
      expect(p.certainty[k]).toBe(0);
    }
    expect(p.preferred_wine_types).toEqual([]);
  });

  it("schließt bei „offen für alles“ keine Weinart aus", () => {
    expect(computeTasteProfile({ ...FRUITY_SWEET_ANSWERS, q9_wine_type: "open" }).preferred_wine_types).toEqual([]);
  });
});

describe("Geschmackstyp", () => {
  it("leitet passende Typen aus dem Profil ab", () => {
    expect(determineTasteType(computeTasteProfile(DRY_BOLD_ANSWERS)).id).toBe("bold");
    expect(determineTasteType(computeTasteProfile(FRESH_ANSWERS)).id).toBe("fresh");
    expect(["fruity", "sweet"]).toContain(determineTasteType(computeTasteProfile(FRUITY_SWEET_ANSWERS)).id);
  });
  it("beschreibt das Profil in einfachen Sätzen", () => {
    const text = describeProfile(computeTasteProfile(DRY_BOLD_ANSWERS));
    expect(text).toMatch(/^Du magst/);
    expect(text).toMatch(/Wir suchen deshalb besonders nach/);
  });
});
