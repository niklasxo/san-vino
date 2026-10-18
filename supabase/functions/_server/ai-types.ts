// Gemeinsame Typen & Helfer für alle KI-Anbieter (nur Deno).

export interface StructuredRequest {
  model: string;
  system: string;
  userContent: Array<{ type: "input_text"; text: string } | { type: "input_image"; image_url: string; detail: "low" | "high" | "auto" }>;
  schemaName: string;
  schema: Record<string, unknown>;
  maxOutputTokens: number;
  /** Gesamtbudget inkl. Wiederholungen. */
  deadlineMs: number;
  attemptTimeoutMs: number;
}

export interface StructuredResponse {
  data: unknown;
  usage: { input_tokens?: number; output_tokens?: number };
  model: string;
}

export const RETRYABLE = new Set([408, 409, 429, 500, 502, 503, 504]);

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Bytes → data:-URL (Base64), ohne den Inhalt jemals zu loggen. */
export function toDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

/** Erkennt das echte Bildformat anhand der Magic Bytes (nicht anhand des Dateinamens). */
export function sniffImageMime(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  return null;
}
