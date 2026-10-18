import { z } from "zod";

/** Formular zum Korrigieren erkannter Weindaten. */
export const wineEditSchema = z.object({
  name: z.string().trim().min(1, "Bitte gib einen Namen ein.").max(200),
  producer: z.string().trim().max(200),
  vintage: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{4}$/.test(v) && Number(v) >= 1900 && Number(v) <= new Date().getFullYear() + 1), "Bitte ein Jahr wie 2021."),
  grapes: z.string().trim().max(200),
  region: z.string().trim().max(120),
  country: z.string().trim().max(120),
  wine_type: z.enum(["red", "white", "rose", "sparkling", "sweet", "orange", "other", "unknown"]),
});
export type WineEditForm = z.infer<typeof wineEditSchema>;
