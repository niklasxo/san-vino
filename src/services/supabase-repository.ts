import type { SupabaseClient } from "@supabase/supabase-js";
import type { SwipeAnswer, SwipeAnswers } from "@/lib/taste-profile/swipes";
import { currentUserId } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase/client";
import { parseScanItem } from "@/lib/validation/api";
import { QUESTION_KEYS, type QuestionKey } from "@/lib/taste-profile/questions";
import type { ProfileState, RatingInput, SavedWine, Scan, ScanItem, ScanWithItems, TasteAnswers, WineRating } from "@/types/domain";
import type { SaveOnboardingInput, VinoRepository } from "./repository";

const BUCKET = "wine-scans";
const SCAN_COLUMNS = "id, scan_type, status, image_paths, analysis_meta, error_code, created_at, analyzed_at";
const SAVED_WINE_COLUMNS = "id, wine_id, scan_item_id, wine_snapshot, is_favorite, has_tried, created_at, wine_ratings(*)";

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) {
    if (/fetch|network/i.test(res.error.message)) throw new AppError("unreachable", res.error.message);
    throw new AppError(res.error.code ?? "db_error", res.error.message);
  }
  return res.data;
}

function toSavedWine(row: any): SavedWine {
  const ratings = Array.isArray(row.wine_ratings) ? row.wine_ratings : row.wine_ratings ? [row.wine_ratings] : [];
  const { wine_ratings: _ignored, ...rest } = row;
  return { ...rest, rating: (ratings[0] as WineRating | undefined) ?? null };
}

export class SupabaseRepository implements VinoRepository {
  readonly kind = "supabase" as const;
  private get db(): SupabaseClient {
    return getSupabase();
  }

  getUserId() {
    return currentUserId();
  }

  async getProfileState(): Promise<ProfileState> {
    const userId = await currentUserId();
    const [profile, answers, taste] = await Promise.all([
      this.db.from("profiles").select("taste_type, onboarding_completed").eq("user_id", userId).maybeSingle(),
      this.db.from("taste_answers").select("question_key, answer").eq("user_id", userId),
      this.db
        .from("taste_profiles")
        .select("initial_profile, learned_profile, profile_version, confidence, updated_at")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    const p = check(profile);
    const a = check(answers) ?? [];
    const t = check(taste);

    const answerMap: TasteAnswers = {};
    for (const row of a) {
      if ((QUESTION_KEYS as readonly string[]).includes(row.question_key)) {
        answerMap[row.question_key as QuestionKey] = row.answer?.value;
      }
    }
    return {
      userId,
      tasteType: p?.taste_type ?? null,
      onboardingCompleted: Boolean(p?.onboarding_completed && t),
      answers: answerMap,
      taste: t
        ? {
            initial: t.initial_profile,
            learned: t.learned_profile,
            version: t.profile_version,
            confidence: t.confidence,
            updated_at: t.updated_at,
          }
        : null,
    };
  }

  async saveOnboarding({ answers, initial, learned, tasteType }: SaveOnboardingInput) {
    const userId = await currentUserId();
    const rows = Object.entries(answers)
      .filter(([, v]) => v != null)
      .map(([question_key, value]) => ({ user_id: userId, question_key, answer: { value } }));
    check(await this.db.from("taste_answers").upsert(rows, { onConflict: "user_id,question_key" }));

    const existing = check(await this.db.from("taste_profiles").select("profile_version").eq("user_id", userId).maybeSingle());
    check(
      await this.db.from("taste_profiles").upsert(
        {
          user_id: userId,
          initial_profile: initial,
          learned_profile: learned,
          profile_version: (existing?.profile_version ?? 0) + 1,
          confidence: learned.confidence,
        },
        { onConflict: "user_id" },
      ),
    );
    check(
      await this.db
        .from("profiles")
        .upsert({ user_id: userId, taste_type: tasteType, onboarding_completed: true }, { onConflict: "user_id" }),
    );
  }

  async updateLearnedProfile(learned: SaveOnboardingInput["learned"], tasteType: string) {
    const userId = await currentUserId();
    const existing = check(await this.db.from("taste_profiles").select("profile_version").eq("user_id", userId).single()) as { profile_version: number };
    check(
      await this.db
        .from("taste_profiles")
        .update({ learned_profile: learned, confidence: learned.confidence, profile_version: existing.profile_version + 1 })
        .eq("user_id", userId),
    );
    check(await this.db.from("profiles").update({ taste_type: tasteType }).eq("user_id", userId));
  }

  async listSwipes(): Promise<SwipeAnswers> {
    const userId = await currentUserId();
    const rows = (check(await this.db.from("taste_swipes").select("question_key, answer").eq("user_id", userId)) ?? []) as {
      question_key: string;
      answer: SwipeAnswer;
    }[];
    return Object.fromEntries(rows.map((r) => [r.question_key, r.answer]));
  }

  async saveSwipe(questionKey: string, answer: SwipeAnswer) {
    const userId = await currentUserId();
    check(
      await this.db
        .from("taste_swipes")
        .upsert({ user_id: userId, question_key: questionKey, answer }, { onConflict: "user_id,question_key" }),
    );
  }

  async resetTasteProfile() {
    const userId = await currentUserId();
    check(await this.db.from("taste_swipes").delete().eq("user_id", userId));
    check(await this.db.from("taste_answers").delete().eq("user_id", userId));
    check(await this.db.from("taste_profiles").delete().eq("user_id", userId));
    check(await this.db.from("profiles").update({ taste_type: null, onboarding_completed: false }).eq("user_id", userId));
  }

  async uploadScanImage(scanId: string, image: Blob): Promise<string> {
    const userId = await currentUserId();
    const path = `${userId}/${scanId}/${crypto.randomUUID().slice(0, 8)}.jpg`;
    const { error } = await this.db.storage.from(BUCKET).upload(path, image, { contentType: image.type || "image/jpeg", upsert: true });
    if (error) throw new AppError("upload_failed", error.message);
    return path;
  }

  async createScan(type: Scan["scan_type"], scanId: string, imagePaths: string[]) {
    const userId = await currentUserId();
    check(
      await this.db
        .from("scans")
        .insert({ id: scanId, user_id: userId, scan_type: type, image_paths: imagePaths, image_path: imagePaths[0], status: "uploaded" }),
    );
  }

  async removeScanImages(paths: string[]) {
    if (paths.length) await this.db.storage.from(BUCKET).remove(paths);
  }

  async getScan(scanId: string): Promise<ScanWithItems | null> {
    const scan = check(await this.db.from("scans").select(SCAN_COLUMNS).eq("id", scanId).maybeSingle()) as Scan | null;
    if (!scan) return null;
    const rows = check(await this.db.from("scan_items").select("*").eq("scan_id", scanId).order("position")) ?? [];
    return { scan, items: rows.map(parseScanItem) };
  }

  async listRecentScans(limit: number) {
    const scans = check(
      await this.db.from("scans").select(`${SCAN_COLUMNS}, scan_items(*)`).in("status", ["analyzed"]).order("created_at", { ascending: false }).limit(limit),
    ) as (Scan & { scan_items: ScanItem[] })[];
    return scans.map(({ scan_items, ...scan }) => {
      const sorted = scan_items.map(parseScanItem).sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1));
      return { ...scan, item_count: scan_items.length, top_item: sorted[0] ?? null };
    });
  }

  async updateScanItem(itemId: string, patch: Parameters<VinoRepository["updateScanItem"]>[1]) {
    return parseScanItem(check(await this.db.from("scan_items").update(patch).eq("id", itemId).select("*").single()));
  }

  async deleteScan(scanId: string) {
    const scan = check(await this.db.from("scans").select("image_paths").eq("id", scanId).maybeSingle());
    if (scan?.image_paths?.length) await this.db.storage.from(BUCKET).remove(scan.image_paths);
    check(await this.db.from("scans").delete().eq("id", scanId));
  }

  async getImageUrl(path: string) {
    const { data } = await this.db.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
    return data?.signedUrl ?? null;
  }

  async listSavedWines(): Promise<SavedWine[]> {
    const rows = check(await this.db.from("user_wines").select(SAVED_WINE_COLUMNS).order("created_at", { ascending: false }));
    return (rows ?? []).map(toSavedWine);
  }

  async getSavedWine(id: string) {
    const row = check(await this.db.from("user_wines").select(SAVED_WINE_COLUMNS).eq("id", id).maybeSingle());
    return row ? toSavedWine(row) : null;
  }

  async findSavedWineByScanItem(scanItemId: string) {
    const row = check(await this.db.from("user_wines").select(SAVED_WINE_COLUMNS).eq("scan_item_id", scanItemId).maybeSingle());
    return row ? toSavedWine(row) : null;
  }

  async saveWine(input: Parameters<VinoRepository["saveWine"]>[0]) {
    const userId = await currentUserId();
    if (input.scanItemId) {
      const existing = await this.findSavedWineByScanItem(input.scanItemId);
      if (existing) {
        if (input.isFavorite || input.hasTried) {
          return this.updateSavedWine(existing.id, {
            ...(input.isFavorite ? { is_favorite: true } : {}),
            ...(input.hasTried ? { has_tried: true } : {}),
          });
        }
        return existing;
      }
    }
    const row = check(
      await this.db
        .from("user_wines")
        .insert({
          user_id: userId,
          scan_item_id: input.scanItemId,
          wine_id: input.wineId,
          wine_snapshot: input.snapshot,
          is_favorite: input.isFavorite ?? false,
          has_tried: input.hasTried ?? false,
        })
        .select(SAVED_WINE_COLUMNS)
        .single(),
    );
    return toSavedWine(row);
  }

  async updateSavedWine(id: string, patch: { is_favorite?: boolean; has_tried?: boolean }) {
    return toSavedWine(check(await this.db.from("user_wines").update(patch).eq("id", id).select(SAVED_WINE_COLUMNS).single()));
  }

  async removeSavedWine(id: string) {
    check(await this.db.from("user_wines").delete().eq("id", id));
  }

  async upsertRating(userWineId: string, input: RatingInput): Promise<WineRating> {
    const userId = await currentUserId();
    const row = check(
      await this.db
        .from("wine_ratings")
        .upsert({ user_id: userId, user_wine_id: userWineId, ...input }, { onConflict: "user_wine_id" })
        .select("*")
        .single(),
    );
    check(await this.db.from("user_wines").update({ has_tried: true }).eq("id", userWineId));
    return row as WineRating;
  }

  async deleteRating(userWineId: string) {
    check(await this.db.from("wine_ratings").delete().eq("user_wine_id", userWineId));
  }

  async deleteAllData() {
    const { error } = await this.db.functions.invoke("delete-my-data", { body: { confirm: "DELETE" } });
    if (error) throw new AppError("unreachable", error.message);
    await this.db.auth.signOut({ scope: "local" });
  }
}
