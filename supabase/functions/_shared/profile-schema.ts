/** Validierung gespeicherter Geschmacksprofile (z. B. in Edge Functions). */
import { z } from "zod";
import { FRUIT_NOTES, PREFERABLE_WINE_TYPES, USER_PREFERENCE_KEYS, type UserTasteProfile } from "./taste-types.ts";

const score = z.number().min(0).max(100);

export const userTasteProfileSchema = z.object({
  sweetness_preference: score,
  acidity_preference: score,
  body_preference: score,
  tannin_tolerance: score,
  bitterness_tolerance: score,
  fruitiness_preference: score,
  oak_preference: score,
  spice_preference: score,
  intensity_preference: score,
  preferred_wine_types: z.array(z.enum(PREFERABLE_WINE_TYPES)),
  preferred_fruit_notes: z.array(z.enum(FRUIT_NOTES)),
  certainty: z.object(
    Object.fromEntries(USER_PREFERENCE_KEYS.map((k) => [k, z.number().min(0).max(1)])) as Record<
      (typeof USER_PREFERENCE_KEYS)[number],
      z.ZodNumber
    >,
  ),
  confidence: z.enum(["initial", "learning", "established"]),
  ratings_count: z.number().int().min(0),
}) satisfies z.ZodType<UserTasteProfile>;
