/** Matching-Logik – gemeinsam mit den Edge Functions genutzt (supabase/functions/_shared). */
export {
  computeMatch,
  dimensionSimilarity,
  MATCH_CATEGORY_LABEL,
  MATCH_WEIGHTS,
  matchCategory,
  MATCHING_VERSION,
  SOURCE_RELIABILITY,
} from "@shared/matching.ts";
export type { DimensionBreakdown, MatchCategory, MatchConfidence, MatchInput, MatchResult } from "@shared/matching.ts";
export { rankItems } from "./rank";
export { shortReason, likelyLikes, likelyDislikes, ruleBasedExplanation } from "./reasons";
