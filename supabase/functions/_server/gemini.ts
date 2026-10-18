/**
 * Google-Gemini-Client (kostenloser Tarif möglich) mit JSON-Ausgabe nach Schema,
 * Timeouts und kontrollierten Wiederholungsversuchen.
 * Der API-Key kommt ausschließlich aus den Supabase Secrets und wird nie geloggt.
 */
import { HttpError } from "./http.ts";
import { RETRYABLE, sleep, type StructuredRequest, type StructuredResponse } from "./ai-types.ts";

const API = "https://generativelanguage.googleapis.com/v1beta/models";

function toParts(content: StructuredRequest["userContent"]) {
  return content.map((c) => {
    if (c.type === "input_text") return { text: c.text };
    const match = /^data:([^;]+);base64,(.*)$/.exec(c.image_url);
    if (!match) throw new HttpError(400, "image_invalid");
    return { inline_data: { mime_type: match[1], data: match[2] } };
  });
}

export async function callGemini(req: StructuredRequest): Promise<StructuredResponse> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new HttpError(503, "not_configured", "GEMINI_API_KEY fehlt");

  const contents = [{ role: "user", parts: toParts(req.userContent) }];
  // Ohne Schema-Unterstützung wird das Zielformat im Prompt beschrieben.
  const system = (withSchema: boolean) =>
    withSchema
      ? req.system
      : `${req.system}\n\nOUTPUT FORMAT: Return ONLY a JSON object that matches this JSON Schema exactly (all keys required):\n${JSON.stringify(req.schema)}`;
  const config = (withSchema: boolean, withThinking: boolean) => ({
    responseMimeType: "application/json",
    ...(withSchema ? { responseJsonSchema: req.schema } : {}),
    ...(withThinking ? { thinkingConfig: thinkingFor(req.model) } : {}),
    maxOutputTokens: req.maxOutputTokens,
    temperature: 0.2,
  });

  const started = Date.now();
  let attempt = 0;
  let withSchema = true;
  // Ausführliches „Nachdenken“ macht das Ablesen von Etiketten/Karten nur langsam → knapp halten.
  let withThinking = Deno.env.get("GEMINI_THINKING") !== "default";
  let lastError: unknown;

  while (attempt < 4) {
    attempt++;
    const remaining = req.deadlineMs - (Date.now() - started);
    if (remaining < 5_000) break;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(req.attemptTimeoutMs, remaining));
    try {
      const res = await fetch(`${API}/${encodeURIComponent(req.model)}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system(withSchema) }] },
          contents,
          generationConfig: config(withSchema, withThinking),
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        lastError = new Error(`Gemini HTTP ${res.status}: ${detail.slice(0, 300)}`);
        console.error(`[vino] gemini HTTP ${res.status} attempt=${attempt}:`, detail.slice(0, 200));
        // 400: zuerst ohne Denk-Einstellung, dann ohne Schema erneut versuchen
        // (die Antwort wird anschließend trotzdem mit Zod streng geprüft).
        if (res.status === 400 && withThinking) {
          withThinking = false;
          continue;
        }
        if (res.status === 400 && withSchema) {
          withSchema = false;
          continue;
        }
        if (res.status === 429) {
          // Kostenloses Kontingent erschöpft oder zu viele Anfragen pro Minute.
          if (attempt < 3 && req.deadlineMs - (Date.now() - started) > 20_000) {
            await sleep(attempt * 4_000);
            continue;
          }
          throw new HttpError(429, "rate_limited", "Gemini-Kontingent erschöpft");
        }
        if (RETRYABLE.has(res.status) && attempt < 4) {
          await sleep(attempt * 1_500);
          continue;
        }
        throw new HttpError(502, "ai_unavailable");
      }
      const payload = await res.json();
      console.log(
        `[vino] gemini ok model=${payload.modelVersion ?? req.model} ms=${Date.now() - started} attempt=${attempt}` +
          ` in=${payload.usageMetadata?.promptTokenCount} out=${payload.usageMetadata?.candidatesTokenCount}` +
          ` thoughts=${payload.usageMetadata?.thoughtsTokenCount ?? 0}`,
      );
      return {
        data: extractJson(payload),
        usage: { input_tokens: payload.usageMetadata?.promptTokenCount, output_tokens: payload.usageMetadata?.candidatesTokenCount },
        model: payload.modelVersion ?? req.model,
      };
    } catch (err) {
      if (err instanceof HttpError) throw err;
      lastError = err;
      console.error(`[vino] gemini attempt ${attempt} failed after ${Date.now() - started} ms:`, err instanceof Error ? err.name : String(err));
      if (attempt < 4) await sleep(1_000);
    } finally {
      clearTimeout(timer);
    }
  }
  console.error("[vino] gemini failed after retries:", lastError instanceof Error ? lastError.message : String(lastError));
  throw new HttpError(504, "ai_unavailable");
}

// deno-lint-ignore no-explicit-any
function extractJson(payload: any): unknown {
  if (payload.promptFeedback?.blockReason) throw new HttpError(422, "ai_refused");
  const candidate = payload.candidates?.[0];
  if (!candidate) throw new HttpError(502, "ai_invalid_response", "no candidate");
  if (["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "RECITATION"].includes(candidate.finishReason)) {
    throw new HttpError(422, "ai_refused");
  }
  if (candidate.finishReason === "MAX_TOKENS") throw new HttpError(502, "ai_invalid_response", "max tokens");
  const text = (candidate.content?.parts ?? [])
    // deno-lint-ignore no-explicit-any
    .filter((p: any) => typeof p.text === "string" && !p.thought)
    // deno-lint-ignore no-explicit-any
    .map((p: any) => p.text)
    .join("");
  // Falls das Modell doch einen ```json-Block schickt.
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new HttpError(502, "ai_invalid_response", "not json");
  }
}

/**
 * Gemini 2.x steuert das Nachdenken über ein Token-Budget, neuere Modelle über eine Stufe.
 * Standard: so wenig wie möglich – für Texterkennung reicht das, und es ist deutlich schneller.
 */
export function thinkingFor(model: string): Record<string, unknown> {
  if (/gemini-(1\.|2\.)/.test(model)) return { thinkingBudget: /pro/.test(model) ? 128 : 0 };
  return { thinkingLevel: Deno.env.get("GEMINI_THINKING_LEVEL") || "low" };
}
