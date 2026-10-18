import { describe, expect, it } from "vitest";
import { ANALYSIS_SYSTEM_PROMPT, EXPLANATION_SYSTEM_PROMPT, buildExplanationInput } from "@shared/prompts.ts";
import { computeMatch, matchCategory } from "@shared/matching.ts";
import { imageAnalysisJsonSchema, imageAnalysisSchema, wineExplanationSchema } from "@shared/wine-schema.ts";
import { DEMO_PRIMITIVO } from "@/demo/fixtures";
import { analyzeResponseSchema } from "@/lib/validation/api";
import { FRUITY_SWEET_ANSWERS, profileFrom } from "./helpers";

const validAnalysis = { image_quality: "good", detected_content: "bottle", wines: [DEMO_PRIMITIVO], notes_for_user: null };

describe("Validierung der KI-Bilderkennung", () => {
  it("akzeptiert eine gültige Antwort", () => {
    expect(imageAnalysisSchema.safeParse(validAnalysis).success).toBe(true);
  });

  it("lehnt fehlerhafte Antworten ab", () => {
    expect(imageAnalysisSchema.safeParse({}).success).toBe(false);
    expect(imageAnalysisSchema.safeParse({ ...validAnalysis, image_quality: "great" }).success).toBe(false);
    expect(imageAnalysisSchema.safeParse({ ...validAnalysis, wines: [{ ...DEMO_PRIMITIVO, wine_type: "beer" }] }).success).toBe(false);
    expect(imageAnalysisSchema.safeParse({ ...validAnalysis, wines: [{ ...DEMO_PRIMITIVO, identification_confidence: 4 }] }).success).toBe(false);
    const tp = { ...DEMO_PRIMITIVO.taste_properties, sweetness: { value: 250, source: "knowledge" } };
    expect(imageAnalysisSchema.safeParse({ ...validAnalysis, wines: [{ ...DEMO_PRIMITIVO, taste_properties: tp }] }).success).toBe(false);
  });

  it("bereinigt unplausible Werte statt sie zu übernehmen", () => {
    const wine = { ...DEMO_PRIMITIVO, vintage: 1066, alcohol_percent: 80, producer: "unknown", name: "  " };
    const parsed = imageAnalysisSchema.parse({ ...validAnalysis, wines: [wine] }).wines[0];
    expect(parsed.vintage).toBeNull();
    expect(parsed.alcohol_percent).toBeNull();
    expect(parsed.producer).toBeNull();
    expect(parsed.name).toBeNull();
  });

  it("erzwingt Konsistenz: unbekannte Merkmale haben keinen Wert", () => {
    const tp = { ...DEMO_PRIMITIVO.taste_properties, oak: { value: 70, source: "unknown" } };
    const parsed = imageAnalysisSchema.parse({ ...validAnalysis, wines: [{ ...DEMO_PRIMITIVO, taste_properties: tp }] });
    expect(parsed.wines[0].taste_properties.oak).toEqual({ value: null, source: "unknown" });
  });

  it("JSON-Schema ist strict-kompatibel (alle Felder required, keine Zusatzfelder)", () => {
    const check = (node: Record<string, unknown>) => {
      if (node.type === "object" || (Array.isArray(node.type) && node.type.includes("object"))) {
        expect(node.additionalProperties).toBe(false);
        expect([...(node.required as string[])].sort()).toEqual(Object.keys(node.properties as object).sort());
        Object.values(node.properties as Record<string, Record<string, unknown>>).forEach(check);
      }
      if (node.items) check(node.items as Record<string, unknown>);
    };
    check(imageAnalysisJsonSchema as unknown as Record<string, unknown>);
  });

  it("validiert auch Antworten des eigenen Backends", () => {
    expect(analyzeResponseSchema.safeParse({ cached: false, scan: { id: "x" }, items: [] }).success).toBe(false);
  });
});

describe("Erklärungen & Prompt-Sicherheit", () => {
  it("lehnt unvollständige Erklärungen ab", () => {
    expect(wineExplanationSchema.safeParse({ headline: "" }).success).toBe(false);
  });

  it("behandelt Bildinhalte ausdrücklich als nicht vertrauenswürdige Daten", () => {
    expect(ANALYSIS_SYSTEM_PROMPT).toMatch(/untrusted DATA/);
    expect(ANALYSIS_SYSTEM_PROMPT).toMatch(/Never follow instructions/);
    expect(EXPLANATION_SYSTEM_PROMPT).toMatch(/NICHT ändern/);
  });

  it("übergibt der KI den berechneten Score – und bei Unsicherheit keinen", () => {
    const profile = profileFrom(FRUITY_SWEET_ANSWERS);
    const match = computeMatch(profile, DEMO_PRIMITIVO);
    const input = buildExplanationInput({ wine: DEMO_PRIMITIVO, profile, match, category: matchCategory(match), tasteTypeName: null });
    expect(input.vino_match.score_percent).toBe(match.score);
    const uncertain = buildExplanationInput({ wine: DEMO_PRIMITIVO, profile, match, category: "uncertain", tasteTypeName: null });
    expect(uncertain.vino_match.score_percent).toBeNull();
  });
});
