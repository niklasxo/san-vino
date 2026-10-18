/**
 * Business-Logik rund ums Geschmacksprofil – unabhängig von UI und Datenbank.
 */
import type { UserTasteProfile } from "@shared/taste-types.ts";
import { computeTasteProfile } from "@/lib/taste-profile/compute";
import { type RatingForLearning, rebuildLearnedProfile } from "@/lib/taste-profile/learning";
import { determineTasteType } from "@/lib/taste-profile/taste-type";
import type { SavedWine, TasteAnswers } from "@/types/domain";
import type { VinoRepository } from "./repository";

export function ratingsForLearning(saved: SavedWine[]): RatingForLearning[] {
  return saved
    .filter((w) => w.rating && (w.rating.verdict || w.rating.rating))
    .map((w) => ({
      verdict: w.rating!.verdict,
      rating: w.rating!.rating,
      liked_reasons: w.rating!.liked_reasons ?? [],
      disliked_reasons: w.rating!.disliked_reasons ?? [],
      wine: {
        wine_type: w.wine_snapshot.wine_type,
        taste_properties: w.wine_snapshot.taste_properties,
        identification_confidence: w.wine_snapshot.identification_confidence,
      },
    }));
}

/** Onboarding abschließen oder Antworten bearbeiten. Vorhandene Bewertungen fließen sofort wieder ein. */
export async function completeOnboarding(repo: VinoRepository, answers: TasteAnswers) {
  const initial = computeTasteProfile(answers);
  const saved = await repo.listSavedWines();
  const learned = rebuildLearnedProfile(initial, ratingsForLearning(saved));
  const type = determineTasteType(learned);
  await repo.saveOnboarding({ answers, initial, learned, tasteType: type.id });
  return { initial, learned, type };
}

/** Nach jeder Bewertung: gelerntes Profil aus Ausgangsprofil + allen Bewertungen neu berechnen. */
export async function relearnProfile(repo: VinoRepository): Promise<{ before: UserTasteProfile; after: UserTasteProfile } | null> {
  const state = await repo.getProfileState();
  if (!state.taste) return null;
  const saved = await repo.listSavedWines();
  const after = rebuildLearnedProfile(state.taste.initial, ratingsForLearning(saved));
  await repo.updateLearnedProfile(after, determineTasteType(after).id);
  return { before: state.taste.learned, after };
}
