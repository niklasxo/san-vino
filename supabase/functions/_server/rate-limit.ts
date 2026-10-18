import type { SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "./http.ts";

export type AiFunction = "analyze-wine-image" | "generate-wine-explanation";

/** Begrenzt KI-Aufrufe pro Nutzer in den letzten 24 Stunden (Kosten- & Missbrauchsschutz). */
export async function assertWithinDailyLimit(db: SupabaseClient, userId: string, fn: AiFunction, limit: number) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await db
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("function_name", fn)
    .gte("created_at", since);
  if (error) throw new HttpError(500, "internal", "usage lookup failed");
  if ((count ?? 0) >= limit) throw new HttpError(429, "rate_limited");
}

export async function recordUsage(
  db: SupabaseClient,
  entry: { userId: string; fn: AiFunction; model: string; inputTokens?: number; outputTokens?: number; success: boolean },
) {
  const { error } = await db.from("ai_usage").insert({
    user_id: entry.userId,
    function_name: entry.fn,
    model: entry.model,
    input_tokens: entry.inputTokens ?? null,
    output_tokens: entry.outputTokens ?? null,
    success: entry.success,
  });
  if (error) console.error("[vino] usage insert failed:", error.message);
}
