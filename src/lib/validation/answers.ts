import { z } from "zod";
import { QUESTIONS } from "@/lib/taste-profile/questions";

/** Zod-Schema der zehn Antworten – direkt aus der Fragendefinition erzeugt. */
export const tasteAnswersSchema = z.object(
  Object.fromEntries(
    QUESTIONS.map((q) => {
      const ids = q.options.map((o) => o.id) as [string, ...string[]];
      return [q.key, q.kind === "multi" ? z.array(z.enum(ids)).min(1, "Bitte wähle mindestens eine Antwort.") : z.enum(ids, "Bitte wähle eine Antwort.")];
    }),
  ),
);
export type TasteAnswersForm = z.infer<typeof tasteAnswersSchema>;
