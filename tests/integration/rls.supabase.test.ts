/**
 * RLS-Integrationstests gegen ein ECHTES Supabase-Projekt (Cloud oder `supabase start`).
 * Erstellt zwei anonyme Nutzer und prüft, dass sie sich gegenseitig nicht sehen.
 *
 *   VINO_TEST_SUPABASE_URL=... VINO_TEST_SUPABASE_ANON_KEY=... npm run test:rls
 *
 * Achtung: legt zwei anonyme Test-Nutzer an. Nur gegen ein Entwicklungsprojekt ausführen.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const url = process.env.VINO_TEST_SUPABASE_URL;
const key = process.env.VINO_TEST_SUPABASE_ANON_KEY;
const d = url && key ? describe : describe.skip;

d("Row Level Security (Supabase)", () => {
  let a: SupabaseClient;
  let b: SupabaseClient;
  let aId = "";
  let bId = "";

  const client = () => createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });

  beforeAll(async () => {
    a = client();
    b = client();
    const ra = await a.auth.signInAnonymously();
    const rb = await b.auth.signInAnonymously();
    if (ra.error || rb.error) throw new Error(`Anonymous Auth fehlgeschlagen – ist sie aktiviert? ${ra.error?.message ?? rb.error?.message}`);
    aId = ra.data.user!.id;
    bId = rb.data.user!.id;
  });

  it("jeder anonyme Nutzer sieht nur das eigene Profil", async () => {
    const { data } = await a.from("profiles").select("user_id");
    expect(data).toEqual([{ user_id: aId }]);
  });

  it("B sieht keine Antworten von A und kann sie nicht ändern", async () => {
    const ins = await a.from("taste_answers").insert({ user_id: aId, question_key: "q1_sweetness", answer: { value: "dry" } });
    expect(ins.error).toBeNull();
    const seen = await b.from("taste_answers").select("*").eq("user_id", aId);
    expect(seen.data).toEqual([]);
    const upd = await b.from("taste_answers").update({ answer: { value: "very_sweet" } }).eq("user_id", aId).select();
    expect(upd.data ?? []).toEqual([]);
  });

  it("B kann keine Daten unter der ID von A anlegen", async () => {
    const r = await b.from("taste_answers").insert({ user_id: aId, question_key: "q2_acidity", answer: { value: "love" } });
    expect(r.error).not.toBeNull();
  });

  it("Storage: B kann nicht in den Ordner von A hochladen oder dort lesen", async () => {
    const scan = await a.from("scans").insert({ user_id: aId, scan_type: "bottle" }).select("id").single();
    expect(scan.error).toBeNull();
    const path = `${aId}/${scan.data!.id}/0.jpg`;
    const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" });
    const upA = await a.storage.from("wine-scans").upload(path, blob, { contentType: "image/jpeg" });
    expect(upA.error).toBeNull();
    const upB = await b.storage.from("wine-scans").upload(`${aId}/${scan.data!.id}/1.jpg`, blob, { contentType: "image/jpeg" });
    expect(upB.error).not.toBeNull();
    const dl = await b.storage.from("wine-scans").download(path);
    expect(dl.error).not.toBeNull();
    await a.storage.from("wine-scans").remove([path]);
  });

  it("Katalog ist für Nutzer schreibgeschützt", async () => {
    const r = await a.from("wines").insert({ catalog_key: `test-${bId}`, name: "Fake" });
    expect(r.error).not.toBeNull();
  });
});
