/**
 * Schemas für KI-Ausgaben (Bilderkennung & Erklärungen).
 *
 * Zwei Darstellungen pro Schema:
 *  1. JSON Schema (strict) für die OpenAI Structured Outputs
 *  2. Zod-Schema zur Validierung der Antwort – der KI wird nie blind vertraut.
 */
import { z } from "zod";
import { FRUIT_NOTES, WINE_DIMENSIONS, WINE_TYPES } from "./taste-types.ts";

const evidenceKind = z.enum(["visible", "inferred", "unknown"]);
const propertySource = z.enum(["knowledge", "style_estimate", "unknown"]);

const nullableText = z
  .string()
  .nullable()
  .transform((v) => {
    if (v == null) return null;
    const t = v.trim();
    if (!t || /^(unknown|unbekannt|n\/a|null|-)$/i.test(t)) return null;
    return t.slice(0, 200);
  });

export const wineTypeSchema = z.enum(WINE_TYPES);

export const winePropertySchema = z
  .object({
    value: z.number().min(0).max(100).nullable(),
    source: propertySource,
  })
  .transform((p) => {
    // Konsistenz erzwingen: ohne Wert keine Quelle, "unknown" ohne Wert.
    if (p.value == null || p.source === "unknown") return { value: null, source: "unknown" as const };
    return { value: Math.round(p.value), source: p.source };
  });

export const wineTastePropertiesSchema = z.object(
  Object.fromEntries(WINE_DIMENSIONS.map((d) => [d, winePropertySchema])) as {
    [K in (typeof WINE_DIMENSIONS)[number]]: typeof winePropertySchema;
  },
);

export const extractedWineSchema = z.object({
  name: nullableText,
  producer: nullableText,
  vintage: z
    .number()
    .int()
    .nullable()
    .transform((v) => (v != null && v >= 1900 && v <= new Date().getFullYear() + 1 ? v : null)),
  country: nullableText,
  region: nullableText,
  grape_varieties: z.array(z.string().min(1).max(60)).max(8),
  wine_type: wineTypeSchema,
  alcohol_percent: z
    .number()
    .nullable()
    .transform((v) => (v != null && v > 0 && v < 25 ? v : null)),
  menu_section: nullableText,
  price: z
    .number()
    .nullable()
    .transform((v) => (v != null && v >= 0 && v < 100_000 ? v : null)),
  currency: nullableText,
  price_unit: z.enum(["glass", "bottle", "carafe", "unknown"]).nullable(),
  price_assignment: z.enum(["clear", "uncertain", "none"]),
  // Nicht mehr im KI-Schema (spart Ausgabe-Tokens); bleibt für ältere Datensätze lesbar.
  other_details: z.array(z.string().max(120)).max(10).default([]),
  identification_confidence: z.number().min(0).max(1),
  evidence: z.object({
    name: evidenceKind,
    producer: evidenceKind,
    vintage: evidenceKind,
    country: evidenceKind,
    region: evidenceKind,
    grape_varieties: evidenceKind,
    wine_type: evidenceKind,
  }),
  taste_properties: wineTastePropertiesSchema,
  typical_notes: z.array(z.string().max(60)).max(6),
  fruit_note_keys: z.array(z.enum(FRUIT_NOTES)).max(6),
});
export type ExtractedWine = z.output<typeof extractedWineSchema>;

export const imageAnalysisSchema = z.object({
  image_quality: z.enum(["good", "poor", "unreadable"]),
  detected_content: z.enum(["bottle", "menu", "other"]),
  wines: z.array(extractedWineSchema).max(80),
  notes_for_user: nullableText,
});
export type ImageAnalysis = z.output<typeof imageAnalysisSchema>;

export const wineExplanationSchema = z.object({
  headline: z.string().min(1).max(140),
  summary_short: z.string().min(1).max(160),
  why: z.string().min(1).max(600),
  might_like: z.array(z.string().min(1).max(200)).max(4),
  might_not_like: z.array(z.string().min(1).max(200)).max(4),
  uncertainty_note: nullableText,
});
export type WineExplanation = z.output<typeof wineExplanationSchema>;

// ───────────────────────── JSON Schemas (OpenAI strict mode) ─────────────────────────

const str = { type: "string" };
const nStr = { type: ["string", "null"] };
const nNum = { type: ["number", "null"] };
const evidenceJson = { type: "string", enum: ["visible", "inferred", "unknown"] };

const propertyJson = {
  type: "object",
  additionalProperties: false,
  required: ["value", "source"],
  properties: {
    value: { type: ["integer", "null"], description: "0-100 oder null, wenn unbekannt" },
    source: { type: "string", enum: ["knowledge", "style_estimate", "unknown"] },
  },
};

const wineJson = {
  type: "object",
  additionalProperties: false,
  required: [
    "name", "producer", "vintage", "country", "region", "grape_varieties", "wine_type",
    "alcohol_percent", "menu_section", "price", "currency", "price_unit", "price_assignment",
    "identification_confidence", "evidence", "taste_properties",
    "typical_notes", "fruit_note_keys",
  ],
  properties: {
    name: nStr,
    producer: nStr,
    vintage: { type: ["integer", "null"] },
    country: nStr,
    region: nStr,
    grape_varieties: { type: "array", items: str },
    wine_type: { type: "string", enum: [...WINE_TYPES] },
    alcohol_percent: nNum,
    menu_section: nStr,
    price: nNum,
    currency: { type: ["string", "null"], description: "ISO-4217, z. B. EUR" },
    price_unit: { type: ["string", "null"], enum: ["glass", "bottle", "carafe", "unknown", null] },
    price_assignment: { type: "string", enum: ["clear", "uncertain", "none"] },
    identification_confidence: { type: "number", description: "0-1: wie sicher ist die Identifikation des konkreten Weins" },
    evidence: {
      type: "object",
      additionalProperties: false,
      required: ["name", "producer", "vintage", "country", "region", "grape_varieties", "wine_type"],
      properties: {
        name: evidenceJson, producer: evidenceJson, vintage: evidenceJson, country: evidenceJson,
        region: evidenceJson, grape_varieties: evidenceJson, wine_type: evidenceJson,
      },
    },
    taste_properties: {
      type: "object",
      additionalProperties: false,
      required: [...WINE_DIMENSIONS],
      properties: Object.fromEntries(WINE_DIMENSIONS.map((d) => [d, propertyJson])),
    },
    typical_notes: { type: "array", items: str, description: "Typische Aromen auf Deutsch, max. 4" },
    fruit_note_keys: { type: "array", items: { type: "string", enum: [...FRUIT_NOTES] } },
  },
};

export const imageAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["image_quality", "detected_content", "wines", "notes_for_user"],
  properties: {
    image_quality: { type: "string", enum: ["good", "poor", "unreadable"] },
    detected_content: { type: "string", enum: ["bottle", "menu", "other"] },
    wines: { type: "array", items: wineJson },
    notes_for_user: nStr,
  },
} as const;

export const wineExplanationJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "summary_short", "why", "might_like", "might_not_like", "uncertainty_note"],
  properties: {
    headline: str,
    summary_short: str,
    why: str,
    might_like: { type: "array", items: str },
    might_not_like: { type: "array", items: str },
    uncertainty_note: nStr,
  },
} as const;

/** Neueinschätzung nach Korrektur durch den Nutzer (nur Text, kein Bild). */
export const reestimateSchema = z.object({
  taste_properties: wineTastePropertiesSchema,
  typical_notes: z.array(z.string().max(60)).max(6),
  fruit_note_keys: z.array(z.enum(FRUIT_NOTES)).max(6),
});
export type Reestimate = z.output<typeof reestimateSchema>;

export const reestimateJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["taste_properties", "typical_notes", "fruit_note_keys"],
  properties: {
    taste_properties: wineJson.properties.taste_properties,
    typical_notes: wineJson.properties.typical_notes,
    fruit_note_keys: wineJson.properties.fruit_note_keys,
  },
} as const;
