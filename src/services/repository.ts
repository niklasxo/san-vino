/**
 * Datenzugriffs-Schnittstelle. UI und Hooks kennen nur dieses Interface –
 * nicht Supabase. Dadurch sind Demo-Modus, Tests und spätere Backends austauschbar.
 */
import type {
  ProfileState,
  RatingInput,
  SavedWine,
  Scan,
  ScanItem,
  ScanType,
  ScanWithItems,
  TasteAnswers,
  UserTasteProfile,
  WineRating,
  WineSnapshot,
} from "@/types/domain";

export interface SaveOnboardingInput {
  answers: TasteAnswers;
  initial: UserTasteProfile;
  learned: UserTasteProfile;
  tasteType: string;
}

export interface VinoRepository {
  readonly kind: "supabase" | "demo";
  getUserId(): Promise<string>;

  // Profil
  getProfileState(): Promise<ProfileState>;
  saveOnboarding(input: SaveOnboardingInput): Promise<void>;
  updateLearnedProfile(learned: UserTasteProfile, tasteType: string): Promise<void>;
  resetTasteProfile(): Promise<void>;

  // Scans
  /** Lädt ein Foto vorab hoch (schon während der Vorschau). Liefert den Speicherpfad. */
  uploadScanImage(scanId: string, image: Blob): Promise<string>;
  /** Legt den Scan mit bereits hochgeladenen Fotos an (Scan-ID wird im Browser erzeugt). */
  createScan(type: ScanType, scanId: string, imagePaths: string[]): Promise<void>;
  /** Verworfene Vorab-Uploads wieder löschen. */
  removeScanImages(paths: string[]): Promise<void>;
  getScan(scanId: string): Promise<ScanWithItems | null>;
  listRecentScans(limit: number): Promise<(Scan & { item_count: number; top_item: ScanItem | null })[]>;
  updateScanItem(itemId: string, patch: Partial<Pick<ScanItem, "extracted_data" | "price" | "currency" | "match_score" | "match_confidence" | "match_details">>): Promise<ScanItem>;
  deleteScan(scanId: string): Promise<void>;
  getImageUrl(path: string): Promise<string | null>;

  // Meine Weine
  listSavedWines(): Promise<SavedWine[]>;
  getSavedWine(id: string): Promise<SavedWine | null>;
  findSavedWineByScanItem(scanItemId: string): Promise<SavedWine | null>;
  saveWine(input: { scanItemId: string | null; wineId: string | null; snapshot: WineSnapshot; isFavorite?: boolean; hasTried?: boolean }): Promise<SavedWine>;
  updateSavedWine(id: string, patch: { is_favorite?: boolean; has_tried?: boolean }): Promise<SavedWine>;
  removeSavedWine(id: string): Promise<void>;

  // Bewertungen
  upsertRating(userWineId: string, input: RatingInput): Promise<WineRating>;
  deleteRating(userWineId: string): Promise<void>;

  // Datenschutz
  deleteAllData(): Promise<void>;
}
