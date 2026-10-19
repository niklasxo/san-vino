/**
 * Kompaktes KI-Ausgabeformat für die Fotoanalyse.
 *
 * Die Dauer einer Analyse hängt fast nur an der Zahl der Ausgabe-Tokens. Das ausführliche Format
 * brauchte ~450 Tokens pro Wein (lange Schlüssel, 8 × {value, source}, 7 Evidence-Felder).
 * Kompakt: kurze Schlüssel, Geschmack als Zahlenreihe, Quellen/Evidence als Buchstabenfolge
 * → ~110 Tokens pro Wein. Danach wird alles ins bisherige Format übersetzt und dort streng geprüft.
 */
import { z } from "zod";
import { FRUIT_NOTES, WINE_DIMENSIONS, WINE_TYPES } from "./taste-types.ts";

/** Reihenfolge der Evidence-Buchstaben in `e`. */
export const EVIDENCE_ORDER = ["name", "producer", "vintage", "country", "region", "grape_varieties", "wine_type"] as const;

const EVIDENCE_CODE = { v: "visible", i: "inferred", u: "unknown" } as const;
const SOURCE_CODE = { k: "knowledge", s: "style_estimate", u: "unknown" } as const;
const UNIT_CODE = { g: "glass", b: "bottle", c: "carafe", u: "unknown" } as const;
const ASSIGN_CODE = { c: "clear", u: "uncertain", n: "none" } as const;

// Locker parsen: kleine Formatfehler des Modells führen zu „unbekannt“, nicht zum Abbruch.
const looseStr = z.string().nullable().optional().catch(null);
const looseNum = z.number().nullable().optional().catch(null);
const looseStrArray = z.array(z.string()).optional().catch([]);

export const compactWineSchema = z.object({
  n: looseStr,
  p: looseStr,
  y: looseNum,
  c: looseStr,
  r: looseStr,
  g: looseStrArray,
  t: z.enum(WINE_TYPES).catch("unknown"),
  s: looseStr,
  pr: looseNum,
  u: z.enum(["g", "b", "c", "u"]).nullable().optional().catch(null),
  pa: z.enum(["c", "u", "n"]).optional().catch("n"),
  a: looseNum,
  id: z.number().catch(0),
  e: z.string().optional().catch(""),
  tp: z.array(z.number().nullable()).optional().catch([]),
  ts: z.string().optional().catch(""),
  no: looseStrArray,
  f: z.array(z.string()).optional().catch([]),
});

export const compactAnalysisSchema = z.object({
  q: z.enum(["good", "poor", "unreadable"]).catch("poor"),
  d: z.enum(["bottle", "menu", "other"]).catch("other"),
  cur: looseStr,
  note: looseStr,
  w: z.array(compactWineSchema).catch([]),
});
export type CompactAnalysis = z.output<typeof compactAnalysisSchema>;

const fruitSet = new Set<string>(FRUIT_NOTES);

/** Übersetzt die kompakte Antwort ins ausführliche Format (danach mit imageAnalysisSchema prüfen). */
export function expandCompactAnalysis(raw: unknown): unknown {
  const parsed = compactAnalysisSchema.safeParse(raw);
  if (!parsed.success) return raw; // ungültig → die strenge Prüfung danach meldet den Fehler
  const a = parsed.data;
  return {
    image_quality: a.q,
    detected_content: a.d,
    notes_for_user: a.note ?? null,
    wines: a.w.map((w) => {
      const evidence = Object.fromEntries(
        EVIDENCE_ORDER.map((key, i) => [key, EVIDENCE_CODE[w.e?.[i] as keyof typeof EVIDENCE_CODE] ?? "unknown"]),
      );
      const taste = Object.fromEntries(
        WINE_DIMENSIONS.map((dim, i) => {
          const value = w.tp?.[i];
          const source = SOURCE_CODE[w.ts?.[i] as keyof typeof SOURCE_CODE] ?? "unknown";
          const valid = typeof value === "number" && value >= 0 && value <= 100 && source !== "unknown";
          return [dim, valid ? { value, source } : { value: null, source: "unknown" }];
        }),
      );
      const price = typeof w.pr === "number" ? w.pr : null;
      return {
        name: w.n ?? null,
        producer: w.p ?? null,
        vintage: typeof w.y === "number" ? Math.round(w.y) : null,
        country: w.c ?? null,
        region: w.r ?? null,
        grape_varieties: (w.g ?? []).filter((g) => g.trim()).slice(0, 8).map((g) => g.slice(0, 60)),
        wine_type: w.t,
        alcohol_percent: w.a ?? null,
        menu_section: w.s ?? null,
        price,
        currency: price != null ? a.cur ?? null : null,
        price_unit: w.u ? UNIT_CODE[w.u] : null,
        price_assignment: price == null ? "none" : ASSIGN_CODE[w.pa ?? "c"],
        identification_confidence: Math.min(1, Math.max(0, w.id)),
        evidence,
        taste_properties: taste,
        typical_notes: (w.no ?? []).slice(0, 4).map((n) => n.slice(0, 60)),
        fruit_note_keys: (w.f ?? []).filter((k) => fruitSet.has(k)).slice(0, 6),
      };
    }),
  };
}

// ───────────────────────── JSON Schema für das Modell ─────────────────────────

const nStr = { type: ["string", "null"] };
const nNum = { type: ["number", "null"] };

export const compactAnalysisJsonSchema = {
  type: "object",
  required: ["q", "d", "cur", "note", "w"],
  properties: {
    q: { type: "string", enum: ["good", "poor", "unreadable"] },
    d: { type: "string", enum: ["bottle", "menu", "other"] },
    cur: { ...nStr, description: "ISO-4217 der Preise, z. B. EUR" },
    note: nStr,
    w: {
      type: "array",
      items: {
        type: "object",
        required: ["n", "p", "y", "c", "r", "g", "t", "s", "pr", "u", "pa", "id", "e", "tp", "ts"],
        properties: {
          n: nStr,
          p: nStr,
          y: { type: ["integer", "null"] },
          c: nStr,
          r: nStr,
          g: { type: "array", items: { type: "string" } },
          t: { type: "string", enum: [...WINE_TYPES] },
          s: nStr,
          pr: nNum,
          u: { type: ["string", "null"], enum: ["g", "b", "c", "u", null] },
          pa: { type: "string", enum: ["c", "u", "n"] },
          a: nNum,
          id: { type: "number" },
          e: { type: "string", description: "7 Buchstaben v/i/u" },
          tp: { type: "array", items: { type: ["integer", "null"] }, description: "8 Werte 0-100" },
          ts: { type: "string", description: "8 Buchstaben k/s/u" },
          no: { type: "array", items: { type: "string" } },
          f: { type: "array", items: { type: "string", enum: [...FRUIT_NOTES] } },
        },
      },
    },
  },
} as const;
