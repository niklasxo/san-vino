// Gemeinsame HTTP-Helfer für alle Edge Functions (nur Deno).

const allowed = (Deno.env.get("VINO_ALLOWED_ORIGINS") ?? "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin = allowed.includes("*") ? "*" : allowed.includes(origin) ? origin : allowed[0] ?? "";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

/** Fehlercodes werden im Frontend in verständliche deutsche Texte übersetzt. */
export type ErrorCode =
  | "unauthorized"
  | "bad_request"
  | "not_found"
  | "rate_limited"
  | "already_running"
  | "image_invalid"
  | "image_too_large"
  | "ai_unavailable"
  | "ai_invalid_response"
  | "ai_refused"
  | "not_configured"
  | "internal";

export class HttpError extends Error {
  constructor(public status: number, public code: ErrorCode, message?: string) {
    super(message ?? code);
  }
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

export function serve(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
    if (req.method !== "POST") return json(req, { error: { code: "bad_request" } }, 405);
    try {
      return await handler(req);
    } catch (err) {
      if (err instanceof HttpError) {
        return json(req, { error: { code: err.code, message: err.message } }, err.status);
      }
      // Keine Bild- oder Nutzerinhalte loggen – nur die Fehlermeldung.
      console.error("[vino] unhandled error:", err instanceof Error ? err.message : String(err));
      return json(req, { error: { code: "internal" } }, 500);
    }
  });
}

export async function readJson(req: Request, maxBytes = 16_384): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "bad_request", "Request body too large");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "bad_request", "Invalid JSON");
  }
}

export function envInt(name: string, fallback: number): number {
  const v = Number.parseInt(Deno.env.get(name) ?? "", 10);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}
