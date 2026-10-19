/**
 * Auswahl des KI-Anbieters.
 *   AI_PROVIDER=gemini (Standard, kostenloser Tarif möglich) → GEMINI_API_KEY, GEMINI_MODEL
 *   AI_PROVIDER=openai                                       → OPENAI_API_KEY, OPENAI_MODEL
 * Ohne AI_PROVIDER wird der Anbieter genommen, dessen Key gesetzt ist (Gemini zuerst).
 */
import type { StructuredRequest, StructuredResponse } from "./ai-types.ts";
import { callGemini } from "./gemini.ts";
import { callOpenAI } from "./openai.ts";

export type { StructuredRequest, StructuredResponse } from "./ai-types.ts";
export { sniffImageMime, toDataUrl } from "./ai-types.ts";

type Provider = "gemini" | "openai";

export function aiProvider(): Provider {
  const explicit = Deno.env.get("AI_PROVIDER")?.trim().toLowerCase();
  if (explicit === "openai" || explicit === "gemini") return explicit;
  if (Deno.env.get("GEMINI_API_KEY")) return "gemini";
  if (Deno.env.get("OPENAI_API_KEY")) return "openai";
  return "gemini";
}

/** Modell je Aufgabe: "vision" = Fotoanalyse, "text" = Erklärungen & Neueinschätzungen. */
export function aiModel(task: "vision" | "text"): string {
  if (aiProvider() === "openai") {
    const base = Deno.env.get("OPENAI_MODEL") || "gpt-5-mini";
    return task === "text" ? Deno.env.get("OPENAI_EXPLANATION_MODEL") || base : base;
  }
  // "-latest" zeigt immer auf das aktuelle Modell (im kostenlosen Tarif enthalten).
  // Fotos: Flash-Lite liest Karten schnell genug (~12 s für 14 Weine), Flash läuft parallel als Absicherung.
  // Texte: Flash formuliert besser; die Erklärung wird ohnehin im Hintergrund vorgeladen.
  if (task === "vision") return Deno.env.get("GEMINI_MODEL") || "gemini-flash-lite-latest";
  return Deno.env.get("GEMINI_TEXT_MODEL") || "gemini-flash-latest";
}

export function callStructured(req: StructuredRequest): Promise<StructuredResponse> {
  return aiProvider() === "openai" ? callOpenAI(req) : callGemini(req);
}
