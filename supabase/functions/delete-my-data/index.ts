/**
 * delete-my-data
 * ──────────────
 * Löscht ALLE persönlichen Daten des angemeldeten Nutzers:
 * Fotos im Storage + Auth-Nutzer (alle Tabellen hängen per ON DELETE CASCADE daran).
 */
import { z } from "zod";
import { HttpError, json, readJson, serve } from "../_server/http.ts";
import { requireUser, serviceClient } from "../_server/supabase.ts";

const bodySchema = z.object({ confirm: z.literal("DELETE") });

serve(async (req) => {
  const user = await requireUser(req);
  if (!bodySchema.safeParse(await readJson(req)).success) throw new HttpError(400, "bad_request");
  const db = serviceClient();
  const bucket = db.storage.from("wine-scans");

  // Ordnerstruktur: <user_id>/<scan_id>/<datei>
  const { data: folders } = await bucket.list(user.id, { limit: 1000 });
  for (const folder of folders ?? []) {
    const { data: files } = await bucket.list(`${user.id}/${folder.name}`, { limit: 100 });
    const paths = (files ?? []).map((f) => `${user.id}/${folder.name}/${f.name}`);
    if (paths.length) await bucket.remove(paths);
  }

  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) throw new HttpError(500, "internal", "delete user failed");
  return json(req, { deleted: true });
});
