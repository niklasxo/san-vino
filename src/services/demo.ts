/**
 * Demo-Modus: vollständig im Arbeitsspeicher, nichts wird in Supabase geschrieben,
 * keine KI wird aufgerufen. Alle Ergebnisse sind als Demo-Daten gekennzeichnet.
 * Demo-Daten liegen nur in sessionStorage dieses Tabs (keine echten Nutzerdaten)
 * und verschwinden beim Schließen des Tabs. Fotos werden nicht gespeichert.
 */
import { computeMatch } from "@shared/matching.ts";
import { DEMO_BOTTLE_SEQUENCE, DEMO_MENU } from "@/demo/fixtures";
import { AppError } from "@/lib/errors";
import { ruleBasedExplanation } from "@/lib/matching/reasons";
import type { ProfileState, RatingInput, SavedWine, Scan, ScanItem, ScanType, WineRating } from "@/types/domain";
import type { AiService } from "./ai-service";
import type { SaveOnboardingInput, VinoRepository } from "./repository";

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

class DemoStore {
  userId = `demo-${id()}`;
  profile: ProfileState = { userId: this.userId, tasteType: null, onboardingCompleted: false, answers: {}, taste: null };
  scans = new Map<string, Scan>();
  images = new Map<string, string>();
  items = new Map<string, ScanItem>();
  saved = new Map<string, SavedWine>();
  bottleScanCount = 0;
}

const STORAGE_KEY = "vino-demo-store";

function loadStore(): DemoStore {
  const s = new DemoStore();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      s.userId = d.userId;
      s.profile = d.profile;
      s.scans = new Map(d.scans);
      s.items = new Map(d.items);
      s.saved = new Map(d.saved);
      s.bottleScanCount = d.bottleScanCount ?? 0;
    }
  } catch {
    /* frischer Demo-Zustand */
  }
  return s;
}

const store = loadStore();

/** Nach jeder Änderung den Demo-Zustand sichern. */
function persist() {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        userId: store.userId,
        profile: store.profile,
        scans: [...store.scans],
        items: [...store.items],
        saved: [...store.saved],
        bottleScanCount: store.bottleScanCount,
      }),
    );
  } catch {
    /* ignorieren */
  }
}

export class DemoRepository implements VinoRepository {
  readonly kind = "demo" as const;

  async getUserId() {
    return store.userId;
  }

  async getProfileState() {
    return structuredClone(store.profile);
  }

  async saveOnboarding({ answers, initial, learned, tasteType }: SaveOnboardingInput) {
    store.profile = {
      ...store.profile,
      answers,
      tasteType,
      onboardingCompleted: true,
      taste: { initial, learned, version: (store.profile.taste?.version ?? 0) + 1, confidence: learned.confidence, updated_at: now() },
    };
  }

  async updateLearnedProfile(learned: SaveOnboardingInput["learned"], tasteType: string) {
    if (!store.profile.taste) throw new AppError("not_found");
    store.profile.taste = { ...store.profile.taste, learned, confidence: learned.confidence, version: store.profile.taste.version + 1, updated_at: now() };
    store.profile.tasteType = tasteType;
  }

  async resetTasteProfile() {
    store.profile = { ...store.profile, answers: {}, taste: null, tasteType: null, onboardingCompleted: false };
  }

  async createScan(type: ScanType): Promise<Scan> {
    const scan: Scan = { id: id(), scan_type: type, status: "pending", image_paths: [], analysis_meta: null, error_code: null, created_at: now(), analyzed_at: null };
    store.scans.set(scan.id, scan);
    return { ...scan };
  }

  async uploadScanImages(scanId: string, images: Blob[]) {
    const scan = store.scans.get(scanId);
    if (!scan) throw new AppError("not_found");
    const paths = images.map((blob, i) => {
      const path = `${store.userId}/${scanId}/${i}.jpg`;
      store.images.set(path, URL.createObjectURL(blob));
      return path;
    });
    Object.assign(scan, { image_paths: paths, status: "uploaded" });
    return paths;
  }

  async getScan(scanId: string) {
    const scan = store.scans.get(scanId);
    if (!scan) return null;
    const items = [...store.items.values()].filter((i) => i.scan_id === scanId).sort((a, b) => a.position - b.position);
    return { scan: { ...scan }, items: structuredClone(items) };
  }

  async listRecentScans(limit: number) {
    return [...store.scans.values()]
      .filter((s) => s.status === "analyzed")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit)
      .map((scan) => {
        const items = [...store.items.values()].filter((i) => i.scan_id === scan.id);
        const top = [...items].sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1))[0] ?? null;
        return { ...scan, item_count: items.length, top_item: top };
      });
  }

  async updateScanItem(itemId: string, patch: Parameters<VinoRepository["updateScanItem"]>[1]) {
    const item = store.items.get(itemId);
    if (!item) throw new AppError("not_found");
    Object.assign(item, patch);
    return structuredClone(item);
  }

  async deleteScan(scanId: string) {
    store.scans.get(scanId)?.image_paths.forEach((p) => {
      const url = store.images.get(p);
      if (url) URL.revokeObjectURL(url);
      store.images.delete(p);
    });
    store.scans.delete(scanId);
    for (const [k, v] of store.items) if (v.scan_id === scanId) store.items.delete(k);
    for (const w of store.saved.values()) if (w.scan_item_id && !store.items.has(w.scan_item_id)) w.scan_item_id = null;
  }

  async getImageUrl(path: string) {
    return store.images.get(path) ?? null;
  }

  async listSavedWines() {
    return structuredClone([...store.saved.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }

  async getSavedWine(wineId: string) {
    const w = store.saved.get(wineId);
    return w ? structuredClone(w) : null;
  }

  async findSavedWineByScanItem(scanItemId: string) {
    const w = [...store.saved.values()].find((x) => x.scan_item_id === scanItemId);
    return w ? structuredClone(w) : null;
  }

  async saveWine(input: Parameters<VinoRepository["saveWine"]>[0]) {
    const existing = input.scanItemId ? [...store.saved.values()].find((x) => x.scan_item_id === input.scanItemId) : undefined;
    if (existing) {
      if (input.isFavorite) existing.is_favorite = true;
      if (input.hasTried) existing.has_tried = true;
      return structuredClone(existing);
    }
    const wine: SavedWine = {
      id: id(),
      wine_id: input.wineId,
      scan_item_id: input.scanItemId,
      wine_snapshot: { ...input.snapshot, demo: true },
      is_favorite: input.isFavorite ?? false,
      has_tried: input.hasTried ?? false,
      created_at: now(),
      rating: null,
    };
    store.saved.set(wine.id, wine);
    return structuredClone(wine);
  }

  async updateSavedWine(wineId: string, patch: { is_favorite?: boolean; has_tried?: boolean }) {
    const w = store.saved.get(wineId);
    if (!w) throw new AppError("not_found");
    Object.assign(w, patch);
    return structuredClone(w);
  }

  async removeSavedWine(wineId: string) {
    store.saved.delete(wineId);
  }

  async upsertRating(userWineId: string, input: RatingInput): Promise<WineRating> {
    const w = store.saved.get(userWineId);
    if (!w) throw new AppError("not_found");
    const rating: WineRating = {
      id: w.rating?.id ?? id(),
      user_wine_id: userWineId,
      ...input,
      created_at: w.rating?.created_at ?? now(),
      updated_at: now(),
    };
    w.rating = rating;
    w.has_tried = true;
    return structuredClone(rating);
  }

  async deleteRating(userWineId: string) {
    const w = store.saved.get(userWineId);
    if (w) w.rating = null;
  }

  async deleteAllData() {
    store.scans.clear();
    store.items.clear();
    store.saved.clear();
    store.images.forEach((url) => URL.revokeObjectURL(url));
    store.images.clear();
    await this.resetTasteProfile();
  }
}

export class DemoAiService implements AiService {
  readonly kind = "demo" as const;

  async analyzeScan(scanId: string) {
    const scan = store.scans.get(scanId);
    if (!scan) throw new AppError("not_found");
    if (scan.status === "analyzed") {
      const items = [...store.items.values()].filter((i) => i.scan_id === scanId);
      return { cached: true, scan: { ...scan }, items: structuredClone(items) };
    }
    // Etwas Wartezeit, damit sich der Demo-Ablauf wie die echte Analyse anfühlt.
    await delay(1600);

    const wines =
      scan.scan_type === "menu" ? DEMO_MENU : DEMO_BOTTLE_SEQUENCE[store.bottleScanCount++ % DEMO_BOTTLE_SEQUENCE.length];
    const profile = store.profile.taste?.learned;
    const items: ScanItem[] = wines.map((wine, position) => {
      const match = profile ? computeMatch(profile, wine) : null;
      const item: ScanItem = {
        id: id(),
        scan_id: scanId,
        wine_id: null,
        position,
        extracted_data: structuredClone(wine),
        price: wine.price_assignment === "none" ? null : wine.price,
        currency: wine.currency,
        match_score: match?.score ?? null,
        match_confidence: match?.confidence ?? null,
        match_details: match ? { ...match, profile_version: store.profile.taste?.version ?? null } : null,
        explanation: null,
        created_at: now(),
      };
      store.items.set(item.id, item);
      return item;
    });
    Object.assign(scan, {
      status: "analyzed",
      analyzed_at: now(),
      analysis_meta: { image_quality: "good", detected_content: scan.scan_type, notes_for_user: null, model: "demo", wines_detected: items.length },
    });
    return { cached: false, scan: { ...scan }, items: structuredClone(items) };
  }

  async explainScanItem(scanItemId: string) {
    const item = store.items.get(scanItemId);
    const taste = store.profile.taste;
    if (!item || !taste) throw new AppError("not_found");
    await delay(700);
    const match = computeMatch(taste.learned, item.extracted_data);
    const explanation = ruleBasedExplanation(match, item.extracted_data, taste.version);
    item.explanation = explanation;
    return structuredClone(explanation);
  }

  /** Demo: keine KI – Geschmacksangaben bleiben, nur der Match wird neu berechnet. */
  async reestimateScanItem(scanItemId: string) {
    const item = store.items.get(scanItemId);
    if (!item) throw new AppError("not_found");
    await delay(500);
    const taste = store.profile.taste;
    if (taste) {
      const match = computeMatch(taste.learned, item.extracted_data);
      Object.assign(item, { match_score: match.score, match_confidence: match.confidence, match_details: match, explanation: null });
    }
    return structuredClone(item);
  }
}

// Alle schreibenden Methoden sichern den Demo-Zustand danach automatisch.
function persistAfter<T extends object>(proto: T, methods: (keyof T)[]) {
  for (const m of methods) {
    const original = proto[m] as unknown as (...a: unknown[]) => Promise<unknown>;
    (proto as Record<keyof T, unknown>)[m] = async function (this: unknown, ...args: unknown[]) {
      const result = await original.apply(this, args);
      persist();
      return result;
    };
  }
}
persistAfter(DemoRepository.prototype, [
  "saveOnboarding", "updateLearnedProfile", "resetTasteProfile", "createScan", "uploadScanImages", "updateScanItem",
  "deleteScan", "saveWine", "updateSavedWine", "removeSavedWine", "upsertRating", "deleteRating", "deleteAllData",
]);
persistAfter(DemoAiService.prototype, ["analyzeScan", "explainScanItem", "reestimateScanItem"]);
