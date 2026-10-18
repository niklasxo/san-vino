import { computeTasteProfile } from "@/lib/taste-profile/compute";
import type { TasteAnswers } from "@/lib/taste-profile/questions";

export const FRUITY_SWEET_ANSWERS: TasteAnswers = {
  q1_sweetness: "bit_sweet",
  q2_acidity: "mild",
  q3_fruits: ["strawberry_cherry", "blackberry_dark"],
  q4_intensity: "balanced",
  q5_bitterness: "small",
  q6_drinks: ["cocktails"],
  q7_style: "fruity_sweet",
  q8_oak_spice: "sometimes",
  q9_wine_type: "red",
  q10_description: "fruity_soft",
};

export const DRY_BOLD_ANSWERS: TasteAnswers = {
  q1_sweetness: "dry",
  q2_acidity: "some",
  q3_fruits: ["blackberry_dark"],
  q4_intensity: "max",
  q5_bitterness: "love",
  q6_drinks: ["coffee", "water"],
  q7_style: "strong_intense",
  q8_oak_spice: "love",
  q9_wine_type: "red",
  q10_description: "strong_spicy",
};

export const FRESH_ANSWERS: TasteAnswers = {
  q1_sweetness: "not_so_sweet",
  q2_acidity: "love",
  q3_fruits: ["lemon_grapefruit", "peach_apricot"],
  q4_intensity: "light",
  q5_bitterness: "small",
  q6_drinks: ["lemonade", "water"],
  q7_style: "fresh_crisp",
  q8_oak_spice: "none",
  q9_wine_type: "white",
  q10_description: "fresh_light",
};

export const profileFrom = (a: TasteAnswers) => computeTasteProfile(a);
