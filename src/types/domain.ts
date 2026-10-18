import type { MatchConfidence, MatchResult } from "@shared/matching.ts";
import type { UserTasteProfile } from "@shared/taste-types.ts";
import type { ExtractedWine, WineExplanation } from "@shared/wine-schema.ts";
import type { QuestionKey, TasteAnswers } from "@/lib/taste-profile/questions";
import type { DislikedReason, LikedReason, Verdict } from "@/lib/taste-profile/learning";

export type { ExtractedWine, QuestionKey, TasteAnswers, UserTasteProfile };

export type ScanType = "bottle" | "menu";
export type ScanStatus = "pending" | "uploaded" | "analyzing" | "analyzed" | "no_wine_found" | "unreadable" | "failed";

export interface AnalysisMeta {
  image_quality?: "good" | "poor" | "unreadable";
  detected_content?: "bottle" | "menu" | "other";
  notes_for_user?: string | null;
  model?: string;
  wines_detected?: number;
  started_at?: string;
}

export interface Scan {
  id: string;
  scan_type: ScanType;
  status: ScanStatus;
  image_paths: string[];
  analysis_meta: AnalysisMeta | null;
  error_code: string | null;
  created_at: string;
  analyzed_at: string | null;
}

export interface StoredExplanation extends WineExplanation {
  score: number;
  category: string;
  profile_version: number;
  model?: string;
  generated_at: string;
  /** Nur im Demo-Modus gesetzt. */
  demo?: boolean;
}

export interface ScanItem {
  id: string;
  scan_id: string;
  wine_id: string | null;
  position: number;
  extracted_data: ExtractedWine;
  price: number | null;
  currency: string | null;
  match_score: number | null;
  match_confidence: MatchConfidence | null;
  match_details: (MatchResult & { profile_version?: number | null }) | null;
  explanation: StoredExplanation | null;
  created_at: string;
}

export interface ScanWithItems {
  scan: Scan;
  items: ScanItem[];
}

export interface WineSnapshot extends ExtractedWine {
  saved_from: ScanType | null;
  demo?: boolean;
}

export interface WineRating {
  id: string;
  user_wine_id: string;
  rating: number | null;
  verdict: Verdict | null;
  liked_reasons: LikedReason[];
  disliked_reasons: DislikedReason[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedWine {
  id: string;
  wine_id: string | null;
  scan_item_id: string | null;
  wine_snapshot: WineSnapshot;
  is_favorite: boolean;
  has_tried: boolean;
  created_at: string;
  rating: WineRating | null;
}

export interface TasteProfileRecord {
  initial: UserTasteProfile;
  learned: UserTasteProfile;
  version: number;
  confidence: UserTasteProfile["confidence"];
  updated_at: string;
}

export interface ProfileState {
  userId: string;
  tasteType: string | null;
  onboardingCompleted: boolean;
  answers: TasteAnswers;
  taste: TasteProfileRecord | null;
}

export interface RatingInput {
  verdict: Verdict | null;
  rating: number | null;
  liked_reasons: LikedReason[];
  disliked_reasons: DislikedReason[];
  notes: string | null;
}

export type AnswerMap = Partial<Record<QuestionKey, string | string[]>>;
