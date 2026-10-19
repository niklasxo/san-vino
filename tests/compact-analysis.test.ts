import { describe, expect, it } from "vitest";
import { expandCompactAnalysis } from "@shared/compact-analysis";
import { imageAnalysisSchema } from "@shared/wine-schema";

const compactWine = {
  n: "Primitivo di Manduria",
  p: "Cantina San Marzano",
  y: 2021,
  c: "Italien",
  r: "Apulien",
  g: ["Primitivo"],
  t: "red",
  s: "Rotweine",
  pr: 7.5,
  u: "g",
  pa: "c",
  id: 0.9,
  e: "vvviiiv",
  tp: [12, 45, 80, 55, 85, 40, 35, 80],
  ts: "kkkkkssk",
  no: ["Pflaume", "dunkle Kirsche"],
  f: ["cherry", "dark_fruit", "banana"],
};

describe("kompaktes KI-Format", () => {
  it("wird vollständig ins ausführliche Format übersetzt", () => {
    const parsed = imageAnalysisSchema.parse(expandCompactAnalysis({ q: "good", d: "menu", cur: "EUR", note: null, w: [compactWine] }));
    const w = parsed.wines[0];
    expect(w.name).toBe("Primitivo di Manduria");
    expect(w.vintage).toBe(2021);
    expect(w.price).toBe(7.5);
    expect(w.currency).toBe("EUR");
    expect(w.price_unit).toBe("glass");
    expect(w.price_assignment).toBe("clear");
    expect(w.evidence).toEqual({
      name: "visible", producer: "visible", vintage: "visible", country: "inferred",
      region: "inferred", grape_varieties: "inferred", wine_type: "visible",
    });
    expect(w.taste_properties.sweetness).toEqual({ value: 12, source: "knowledge" });
    expect(w.taste_properties.oak).toEqual({ value: 40, source: "style_estimate" });
    expect(w.taste_properties.intensity).toEqual({ value: 80, source: "knowledge" });
    expect(w.fruit_note_keys).toEqual(["cherry", "dark_fruit"]); // unbekannte Schlüssel fliegen raus
    expect(w.other_details).toEqual([]);
  });

  it("fehlende oder kaputte Angaben werden zu „unbekannt“ statt zum Abbruch", () => {
    const parsed = imageAnalysisSchema.parse(
      expandCompactAnalysis({
        q: "poor", d: "menu", cur: "EUR", note: null,
        w: [{ n: "Hauswein", t: "rosé?", id: 0.4, e: "v", tp: [10, null], ts: "kx", pr: null }],
      }),
    );
    const w = parsed.wines[0];
    expect(w.wine_type).toBe("unknown");
    expect(w.evidence.name).toBe("visible");
    expect(w.evidence.producer).toBe("unknown");
    expect(w.taste_properties.sweetness).toEqual({ value: 10, source: "knowledge" });
    expect(w.taste_properties.acidity).toEqual({ value: null, source: "unknown" });
    expect(w.taste_properties.spice).toEqual({ value: null, source: "unknown" });
    expect(w.price).toBeNull();
    expect(w.currency).toBeNull();
    expect(w.price_assignment).toBe("none");
  });

  it("ein Wert ohne verlässliche Quelle zählt nicht", () => {
    const parsed = imageAnalysisSchema.parse(
      expandCompactAnalysis({ q: "good", d: "bottle", cur: null, note: null, w: [{ ...compactWine, ts: "uuuuuuuu" }] }),
    );
    expect(Object.values(parsed.wines[0].taste_properties).every((p) => p.value === null)).toBe(true);
  });
});
