/**
 * Schlanker OpenAI-Client (Responses API) mit Structured Outputs, Timeouts
 * und kontrollierten Wiederholungsversuchen. Der API-Key kommt ausschließlich
 * aus den Supabase Secrets und wird nie geloggt.
 */
import { HttpError } from "./http.ts";

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

const RETRYABLE = new Set([408, 409, 429, 500, 502, 503, 504]);

function isReasoningModel(model: string) {
  return /^(gpt-5|o\d)/.test(model);
}

export async function callStructured(req: StructuredRequest): Promise<StructuredResponse> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new HttpError(503, "not_configured", "OPENAI_API_KEY fehlt");

  const body: Record<string, unknown> = {
    model: req.model,
    store: false,
    input: [
      { role: "developer", content: [{ type: "input_text", text: req.system }] },
      { role: "user", content: req.userContent },
    ],
    text: { format: { type: "json_schema", name: req.schemaName, schema: req.schema, strict: true } },
    max_output_tokens: req.maxOutputTokens,
  };
  if (isReasoningModel(req.model)) body.reasoning = { effort: Deno.env.get("OPENAI_REASONING_EFFORT") ?? "low" };

  const started = Date.now();
  let attempt = 0;
  let lastError: unknown;

  while (attempt < 3) {
    attempt++;
    const remaining = req.deadlineMs - (Date.now() - started);
    if (remaining < 5_000) break;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(req.attemptTimeoutMs, remaining));
    try {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        lastError = new Error(`OpenAI HTTP ${res.status}: ${detail.slice(0, 300)}`);
        if (RETRYABLE.has(res.status) && attempt < 3) {
          await sleep(attempt * 1_500);
          continue;
        }
        console.error("[vino] openai error", res.status, detail.slice(0, 300));
        throw new HttpError(502, "ai_unavailable");
      }
      const payload = await res.json();
      return { data: extractJson(payload), usage: payload.usage ?? {}, model: payload.model ?? req.model };
    } catch (err) {
      if (err instanceof HttpError) throw err;
      lastError = err;
      if (attempt < 3) await sleep(attempt * 1_500);
    } finally {
      clearTimeout(timer);
    }
  }
  console.error("[vino] openai failed after retries:", lastError instanceof Error ? lastError.message : String(lastError));
  throw new HttpError(504, "ai_unavailable");
}

// deno-lint-ignore no-explicit-any
function extractJson(payload: any): unknown {
  if (payload.status === "incomplete") {
    throw new HttpError(502, "ai_invalid_response", `incomplete: ${payload.incomplete_details?.reason ?? "unknown"}`);
  }
  for (const item of payload.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part.type === "refusal") throw new HttpError(422, "ai_refused");
      if (part.type === "output_text" && typeof part.text === "string") {
        try {
          return JSON.parse(part.text);
        } catch {
          throw new HttpError(502, "ai_invalid_response", "not json");
        }
      }
    }
  }
  throw new HttpError(502, "ai_invalid_response", "no output");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
