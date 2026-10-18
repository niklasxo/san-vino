// Deno-Tests für den Gemini-Client mit simuliertem fetch (kein Netzwerk).
// Aufruf: cd supabase/functions/analyze-wine-image && deno test --allow-env ../_server/gemini.test.ts
import { callGemini } from "./gemini.ts";
import { HttpError } from "./http.ts";

Deno.env.set("GEMINI_API_KEY", "test-key");

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const req = {
  model: "gemini-flash-latest",
  system: "sys",
  userContent: [
    { type: "input_text" as const, text: "hi" },
    { type: "input_image" as const, image_url: "data:image/jpeg;base64,AAAA", detail: "high" as const },
  ],
  schemaName: "x",
  schema: { type: "object" },
  maxOutputTokens: 100,
  deadlineMs: 20_000,
  attemptTimeoutMs: 5_000,
};

function mockFetch(responses: Array<{ status: number; body: unknown }>, seen: unknown[]) {
  let i = 0;
  globalThis.fetch = ((_url: string, init: RequestInit) => {
    seen.push({ url: _url, headers: init.headers, body: JSON.parse(String(init.body)) });
    const r = responses[Math.min(i++, responses.length - 1)];
    return Promise.resolve(new Response(JSON.stringify(r.body), { status: r.status }));
  }) as typeof fetch;
}

Deno.test("liest JSON-Antwort, übergibt Bild als inline_data und Key im Header", async () => {
  const seen: any[] = [];
  mockFetch([{ status: 200, body: { candidates: [{ finishReason: "STOP", content: { parts: [{ text: '{"ok":true}' }] } }], usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2 }, modelVersion: "gemini-x" } }], seen);
  const res = await callGemini(req);
  assert((res.data as any).ok === true, "data");
  assert(res.usage.input_tokens === 5 && res.model === "gemini-x", "usage/model");
  assert(seen[0].url.includes("gemini-flash-latest:generateContent"), "url");
  assert(!seen[0].url.includes("test-key") && seen[0].headers["x-goog-api-key"] === "test-key", "key nur im Header");
  assert(seen[0].body.contents[0].parts[1].inline_data.mime_type === "image/jpeg", "inline image");
  assert(seen[0].body.generationConfig.responseJsonSchema, "schema mitgeschickt");
  assert(seen[0].body.generationConfig.thinkingConfig?.thinkingLevel === "low", "wenig Nachdenken");
});

Deno.test("ignoriert Denk-Teile und ```json-Blöcke", async () => {
  mockFetch([{ status: 200, body: { candidates: [{ finishReason: "STOP", content: { parts: [{ text: "überlege…", thought: true }, { text: "```json\n{\"a\":1}\n```" }] } }] } }], []);
  const res = await callGemini(req);
  assert((res.data as any).a === 1, "parsed");
});

Deno.test("fällt bei 400 erst ohne Denk-Einstellung, dann ohne Schema zurück", async () => {
  const seen: any[] = [];
  mockFetch([
    { status: 400, body: { error: { message: "Unknown name thinkingLevel" } } },
    { status: 400, body: { error: { message: "Invalid value at generation_config" } } },
    { status: 200, body: { candidates: [{ finishReason: "STOP", content: { parts: [{ text: "{}" }] } }] } },
  ], seen);
  await callGemini(req);
  assert(seen.length === 3, "drei Versuche");
  assert(!seen[1].body.generationConfig.thinkingConfig && seen[1].body.generationConfig.responseJsonSchema, "2. Versuch ohne Denken");
  assert(!seen[2].body.generationConfig.responseJsonSchema, "3. Versuch ohne Schema");
  assert(seen[2].body.systemInstruction.parts[0].text.includes("OUTPUT FORMAT"), "Format im Prompt");
});

Deno.test("Sicherheitsblock → ai_refused, Kontingent → rate_limited", async () => {
  mockFetch([{ status: 200, body: { candidates: [{ finishReason: "SAFETY" }] } }], []);
  try { await callGemini(req); throw new Error("no throw"); } catch (e) { assert(e instanceof HttpError && e.code === "ai_refused", "refused"); }
  mockFetch([{ status: 429, body: {} }], []);
  try { await callGemini({ ...req, deadlineMs: 60_000 }); throw new Error("no throw"); } catch (e) { assert(e instanceof HttpError && e.code === "rate_limited", "rate"); }
});

Deno.test("Gemini 2.x nutzt Token-Budget statt Stufe", async () => {
  const { thinkingFor } = await import("./gemini.ts");
  assert((thinkingFor("gemini-2.5-flash") as any).thinkingBudget === 0, "budget 0");
  assert((thinkingFor("gemini-flash-latest") as any).thinkingLevel === "low", "level low");
});
