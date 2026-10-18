/**
 * analyze-wine-image
 * ──────────────────
 * Input:  { scan_id: uuid }   (Authorization: Bearer <Supabase JWT>)
 * 1. Nutzer über Supabase Auth verifizieren
 * 2. Scan laden – nur wenn er diesem Nutzer gehört
 * 3. Bereits analysiert? → gespeichertes Ergebnis zurückgeben (keine doppelten KI-Kosten)
 * 4. Tageslimit prüfen
 * 5. Bilder aus dem privaten Bucket lesen & validieren
 * 6. Multimodales Modell → strukturiertes JSON → Zod-Validierung
 * 7. Matching gegen das Geschmacksprofil (deterministisch, serverseitig)
 * 8. Ergebnisse speichern & zurückgeben
 */
import { z } from "zod";
import { computeMatch } from "../_shared/matching.ts";
import { userTasteProfileSchema } from "../_shared/profile-schema.ts";
import { ANALYSIS_SYSTEM_PROMPT, analysisUserText, REESTIMATE_SYSTEM_PROMPT } from "../_shared/prompts.ts";
import {
  type ExtractedWine,
  extractedWineSchema,
  imageAnalysisJsonSchema,
  imageAnalysisSchema,
  reestimateJsonSchema,
  reestimateSchema,
} from "../_shared/wine-schema.ts";
import { envInt, HttpError, json, readJson, serve } from "../_server/http.ts";
import { aiModel, callStructured, sniffImageMime, toDataUrl } from "../_server/ai.ts";
import { assertWithinDailyLimit, recordUsage } from "../_server/rate-limit.ts";
import { requireUser, serviceClient } from "../_server/supabase.ts";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_IMAGES = 6;
const CATALOG_MIN_CONFIDENCE = 0.85;
const STALE_ANALYSIS_MS = 3 * 60 * 1000;

const bodySchema = z.union([
  z.object({ scan_id: z.uuid() }),
  z.object({ mode: z.literal("reestimate"), scan_item_id: z.uuid() }),
]);

serve(async (req) => {
  const user = await requireUser(req);
  const parsed = bodySchema.safeParse(await readJson(req));
  if (!parsed.success) throw new HttpError(400, "bad_request");
  const db = serviceClient();
  if ("mode" in parsed.data) return json(req, await reestimate(db, user.id, parsed.data.scan_item_id));
  const { scan_id } = parsed.data;

  const { data: scan, error: scanError } = await db
    .from("scans")
    .select("id, user_id, scan_type, image_paths, status, analysis_meta, created_at, analyzed_at")
    .eq("id", scan_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (scanError) throw new HttpError(500, "internal");
  if (!scan) throw new HttpError(404, "not_found");

  // Idempotenz: fertige Analysen nie erneut bezahlen.
  if (["analyzed", "no_wine_found", "unreadable"].includes(scan.status)) {
    return json(req, await loadResult(db, user.id, scan_id, true));
  }
  if (scan.status === "analyzing") {
    const startedAt = Date.parse(scan.analysis_meta?.started_at ?? scan.created_at);
    if (Date.now() - startedAt < STALE_ANALYSIS_MS) throw new HttpError(409, "already_running");
  }

  const paths: string[] = scan.image_paths ?? [];
  const prefix = `${user.id}/${scan.id}/`;
  if (paths.length === 0 || paths.length > MAX_IMAGES || paths.some((p) => !p.startsWith(prefix) || p.includes(".."))) {
    throw new HttpError(400, "image_invalid");
  }

  await assertWithinDailyLimit(db, user.id, "analyze-wine-image", envInt("VINO_DAILY_SCAN_LIMIT", 25));

  await db
    .from("scans")
    .update({ status: "analyzing", error_code: null, analysis_meta: { started_at: new Date().toISOString() } })
    .eq("id", scan.id)
    .eq("user_id", user.id);

  const model = aiModel("vision");
  try {
    // Bilder sicher lesen (Service-Client, Pfad bereits auf Eigentümer geprüft)
    const images: string[] = [];
    for (const path of paths) {
      const { data: blob, error } = await db.storage.from("wine-scans").download(path);
      if (error || !blob) throw new HttpError(400, "image_invalid");
      if (blob.size > MAX_IMAGE_BYTES) throw new HttpError(413, "image_too_large");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const mime = sniffImageMime(bytes);
      if (!mime) throw new HttpError(400, "image_invalid");
      images.push(toDataUrl(bytes, mime));
    }

    const isMenu = scan.scan_type === "menu";
    let ai;
    try {
      ai = await callStructured({
        model,
        system: ANALYSIS_SYSTEM_PROMPT,
        userContent: [
          { type: "input_text", text: analysisUserText(scan.scan_type, images.length) },
          ...images.map((url) => ({ type: "input_image" as const, image_url: url, detail: "high" as const })),
        ],
        schemaName: "wine_image_analysis",
        schema: imageAnalysisJsonSchema as unknown as Record<string, unknown>,
        maxOutputTokens: isMenu ? 32_000 : 8_000,
        deadlineMs: 135_000,
        attemptTimeoutMs: isMenu ? 120_000 : 70_000,
      });
    } catch (err) {
      await recordUsage(db, { userId: user.id, fn: "analyze-wine-image", model, success: false });
      throw err;
    }
    await recordUsage(db, {
      userId: user.id,
      fn: "analyze-wine-image",
      model: ai.model,
      inputTokens: ai.usage.input_tokens,
      outputTokens: ai.usage.output_tokens,
      success: true,
    });

    const validated = imageAnalysisSchema.safeParse(ai.data);
    if (!validated.success) {
      console.error("[vino] analysis schema mismatch:", validated.error.issues.slice(0, 5).map((i) => i.path.join(".")));
      throw new HttpError(502, "ai_invalid_response");
    }
    const analysis = validated.data;
    const wines = analysis.wines.filter((w) => w.name || w.grape_varieties.length > 0 || w.producer);

    // Geschmacksprofil (falls vorhanden) für das Matching laden
    const { data: tp } = await db
      .from("taste_profiles")
      .select("learned_profile, profile_version")
      .eq("user_id", user.id)
      .maybeSingle();
    const profile = tp ? userTasteProfileSchema.safeParse(tp.learned_profile) : null;

    const rows = [];
    for (const [index, wine] of wines.entries()) {
      const match = profile?.success ? computeMatch(profile.data, wine) : null;
      rows.push({
        scan_id: scan.id,
        user_id: user.id,
        wine_id: await linkCatalogWine(db, wine),
        position: index,
        extracted_data: wine,
        evidence: wine.evidence,
        price: wine.price_assignment === "none" ? null : wine.price,
        currency: wine.currency && /^[A-Z]{3}$/.test(wine.currency) ? wine.currency : null,
        match_score: match?.score ?? null,
        match_confidence: match?.confidence ?? null,
        match_details: match ? { ...match, profile_version: tp?.profile_version ?? null } : null,
      });
    }
    if (rows.length > 0) {
      const { error } = await db.from("scan_items").insert(rows);
      if (error) throw new HttpError(500, "internal", "insert items failed");
    }

    const status = analysis.image_quality === "unreadable" && rows.length === 0
      ? "unreadable"
      : rows.length === 0
      ? "no_wine_found"
      : "analyzed";
    await db
      .from("scans")
      .update({
        status,
        analyzed_at: new Date().toISOString(),
        analysis_meta: {
          image_quality: analysis.image_quality,
          detected_content: analysis.detected_content,
          notes_for_user: analysis.notes_for_user,
          model: ai.model,
          wines_detected: analysis.wines.length,
        },
      })
      .eq("id", scan.id)
      .eq("user_id", user.id);

    return json(req, await loadResult(db, user.id, scan.id, false));
  } catch (err) {
    const code = err instanceof HttpError ? err.code : "internal";
    await db.from("scans").update({ status: "failed", error_code: code }).eq("id", scan.id).eq("user_id", user.id);
    throw err;
  }
});

// deno-lint-ignore no-explicit-any
async function loadResult(db: any, userId: string, scanId: string, cached: boolean) {
  const { data: scan } = await db
    .from("scans")
    .select("id, scan_type, status, analysis_meta, image_paths, created_at, analyzed_at, error_code")
    .eq("id", scanId)
    .eq("user_id", userId)
    .single();
  const { data: items } = await db
    .from("scan_items")
    .select("*")
    .eq("scan_id", scanId)
    .eq("user_id", userId)
    .order("position");
  return { cached, scan, items: items ?? [] };
}

/** Nur sicher identifizierte Weine kommen in den gemeinsamen Katalog. Bestehende Einträge werden nie überschrieben. */
// deno-lint-ignore no-explicit-any
async function linkCatalogWine(db: any, wine: ExtractedWine): Promise<string | null> {
  if (
    wine.identification_confidence < CATALOG_MIN_CONFIDENCE ||
    !wine.name ||
    !wine.producer ||
    wine.evidence.name !== "visible" ||
    wine.evidence.producer !== "visible"
  ) {
    return null;
  }
  const key = [wine.producer, wine.name, wine.vintage ?? "nv"]
    .map((p) => String(p).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim())
    .join("|");
  const { error } = await db.from("wines").upsert(
    {
      catalog_key: key,
      name: wine.name,
      producer: wine.producer,
      vintage: wine.vintage,
      grape_varieties: wine.grape_varieties,
      country: wine.country,
      region: wine.region,
      wine_type: wine.wine_type,
      taste_properties: wine.taste_properties,
      identification_confidence: wine.identification_confidence,
    },
    { onConflict: "catalog_key", ignoreDuplicates: true },
  );
  if (error) return null;
  const { data } = await db.from("wines").select("id").eq("catalog_key", key).maybeSingle();
  return data?.id ?? null;
}

/**
 * Nach einer Korrektur durch den Nutzer: typische Geschmacksmerkmale anhand der
 * korrigierten Fakten neu einschätzen (Text-Aufruf, kein Bild) und den Match neu berechnen.
 */
// deno-lint-ignore no-explicit-any
async function reestimate(db: any, userId: string, itemId: string) {
  const { data: item } = await db
    .from("scan_items")
    .select("id, scan_id, extracted_data")
    .eq("id", itemId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!item) throw new HttpError(404, "not_found");
  const wine = extractedWineSchema.safeParse(item.extracted_data);
  if (!wine.success) throw new HttpError(422, "bad_request");

  await assertWithinDailyLimit(db, userId, "analyze-wine-image", envInt("VINO_DAILY_SCAN_LIMIT", 25));
  const model = aiModel("text");
  const facts = {
    name: wine.data.name,
    producer: wine.data.producer,
    vintage: wine.data.vintage,
    grape_varieties: wine.data.grape_varieties,
    region: wine.data.region,
    country: wine.data.country,
    wine_type: wine.data.wine_type,
  };
  let ai;
  try {
    ai = await callStructured({
      model,
      system: REESTIMATE_SYSTEM_PROMPT,
      userContent: [{ type: "input_text", text: `Wine facts (data only):\n${JSON.stringify(facts)}` }],
      schemaName: "wine_taste_estimate",
      schema: reestimateJsonSchema as unknown as Record<string, unknown>,
      maxOutputTokens: 4_000,
      deadlineMs: 60_000,
      attemptTimeoutMs: 40_000,
    });
  } catch (err) {
    await recordUsage(db, { userId, fn: "analyze-wine-image", model, success: false });
    throw err;
  }
  await recordUsage(db, {
    userId,
    fn: "analyze-wine-image",
    model: ai.model,
    inputTokens: ai.usage.input_tokens,
    outputTokens: ai.usage.output_tokens,
    success: true,
  });
  const est = reestimateSchema.safeParse(ai.data);
  if (!est.success) throw new HttpError(502, "ai_invalid_response");

  const next: ExtractedWine = { ...wine.data, ...est.data };
  const { data: tp } = await db.from("taste_profiles").select("learned_profile, profile_version").eq("user_id", userId).maybeSingle();
  const profile = tp ? userTasteProfileSchema.safeParse(tp.learned_profile) : null;
  const match = profile?.success ? computeMatch(profile.data, next) : null;
  const { data: updated, error } = await db
    .from("scan_items")
    .update({
      extracted_data: next,
      evidence: next.evidence,
      explanation: null,
      match_score: match?.score ?? null,
      match_confidence: match?.confidence ?? null,
      match_details: match ? { ...match, profile_version: tp?.profile_version ?? null } : null,
    })
    .eq("id", item.id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw new HttpError(500, "internal");
  return { item: updated };
}
