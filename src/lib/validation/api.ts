/**
 * Validierung der Antworten unserer Edge Functions im Frontend.
 * Auch eigene Backend-Antworten werden nicht ungeprüft übernommen.
 */
import { z } from "zod";
import { extractedWineSchema, wineExplanationSchema } from "@shared/wine-schema.ts";
import type { ScanItem, ScanWithItems, StoredExplanation } from "@/types/domain";

export const storedExplanationSchema = wineExplanationSchema.extend({
  score: z.number(),
  category: z.string(),
  profile_version: z.number(),
  model: z.string().optional(),
  generated_at: z.string(),
  demo: z.boolean().optional(),
});

export const scanSchema = z.object({
  id: z.string(),
  scan_type: z.enum(["bottle", "menu"]),
  status: z.enum(["pending", "uploaded", "analyzing", "analyzed", "no_wine_found", "unreadable", "failed"]),
  image_paths: z.array(z.string()).default([]),
  analysis_meta: z.record(z.string(), z.unknown()).nullable().default(null),
  error_code: z.string().nullable().default(null),
  created_at: z.string(),
  analyzed_at: z.string().nullable().default(null),
});

const numeric = z.union([z.number(), z.string()]).nullable().transform((v) => (v == null ? null : Number(v)));

export const scanItemSchema = z.object({
  id: z.string(),
  scan_id: z.string(),
  wine_id: z.string().nullable(),
  position: z.number(),
  extracted_data: extractedWineSchema,
  price: numeric,
  currency: z.string().nullable(),
  match_score: numeric,
  match_confidence: z.enum(["high", "medium", "low", "insufficient"]).nullable(),
  match_details: z.any().nullable(),
  explanation: storedExplanationSchema.nullable(),
  created_at: z.string(),
});

export const analyzeResponseSchema = z
  .object({ cached: z.boolean(), scan: scanSchema, items: z.array(scanItemSchema) })
  .transform((v) => v as unknown as ScanWithItems & { cached: boolean });

export const explanationResponseSchema = z
  .object({ cached: z.boolean(), explanation: storedExplanationSchema })
  .transform((v) => v as unknown as { cached: boolean; explanation: StoredExplanation });

export function parseScanItem(row: unknown): ScanItem {
  return scanItemSchema.parse(row) as unknown as ScanItem;
}
