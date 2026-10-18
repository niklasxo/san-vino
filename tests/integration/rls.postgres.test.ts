/**
 * RLS-Integrationstests gegen ein echtes Postgres mit nachgebildeter Supabase-Umgebung.
 * Ausführen: npm run test:rls:local   (siehe tests/integration/README.md)
 */
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.VINO_TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("Row Level Security (Postgres)", () => {
  const pool = new pg.Pool({ connectionString: url });
  const A = randomUUID();
  const B = randomUUID();

  async function as<T>(uid: string | null, fn: (c: pg.PoolClient) => Promise<T>, role = "authenticated"): Promise<T> {
    const c = await pool.connect();
    try {
      await c.query("begin");
      await c.query(`set local role ${role}`);
      if (uid) await c.query("select set_config('request.jwt.claim.sub', $1, true)", [uid]);
      const r = await fn(c);
      await c.query("commit");
      return r;
    } catch (e) {
      await c.query("rollback");
      throw e;
    } finally {
      c.release();
    }
  }
  const asService = <T>(fn: (c: pg.PoolClient) => Promise<T>) => as(null, fn, "service_role");

  let scanA = "";
  let scanB = "";
  let itemA = "";
  let itemB = "";
  let userWineB = "";

  beforeAll(async () => {
    await pool.query("insert into auth.users (id) values ($1), ($2)", [A, B]);
    scanA = (await as(A, (c) => c.query("insert into public.scans (user_id, scan_type) values ($1, 'menu') returning id", [A]))).rows[0].id;
    scanB = (await as(B, (c) => c.query("insert into public.scans (user_id, scan_type) values ($1, 'bottle') returning id", [B]))).rows[0].id;
    itemA = (await asService((c) => c.query("insert into public.scan_items (scan_id, user_id, extracted_data) values ($1, $2, '{}') returning id", [scanA, A]))).rows[0].id;
    itemB = (await asService((c) => c.query("insert into public.scan_items (scan_id, user_id, extracted_data) values ($1, $2, '{}') returning id", [scanB, B]))).rows[0].id;
    userWineB = (
      await as(B, (c) =>
        c.query("insert into public.user_wines (user_id, scan_item_id, wine_snapshot) values ($1, $2, '{\"name\":\"B\"}') returning id", [B, itemB]),
      )
    ).rows[0].id;
  });

  afterAll(async () => {
    await pool.query("delete from auth.users where id = any($1)", [[A, B]]);
    await pool.end();
  });

  it("legt für jeden neuen Auth-Nutzer automatisch ein Profil an", async () => {
    const r = await as(A, (c) => c.query("select user_id, onboarding_completed from public.profiles"));
    expect(r.rows).toEqual([{ user_id: A, onboarding_completed: false }]);
  });

  it("zeigt Nutzer B keine Antworten von Nutzer A", async () => {
    await as(A, (c) => c.query(`insert into public.taste_answers (user_id, question_key, answer) values ($1, 'q1_sweetness', '{"value":"dry"}')`, [A]));
    const own = await as(A, (c) => c.query("select count(*)::int as n from public.taste_answers"));
    const foreign = await as(B, (c) => c.query("select count(*)::int as n from public.taste_answers"));
    expect(own.rows[0].n).toBe(1);
    expect(foreign.rows[0].n).toBe(0);
  });

  it("verhindert, dass B Daten unter der User-ID von A anlegt", async () => {
    await expect(
      as(B, (c) => c.query(`insert into public.taste_answers (user_id, question_key, answer) values ($1, 'q2_acidity', '{"value":"love"}')`, [A])),
    ).rejects.toThrow(/row-level security/);
  });

  it("verhindert fremde Updates und Löschungen (0 betroffene Zeilen)", async () => {
    await as(A, (c) => c.query(`insert into public.taste_profiles (user_id, initial_profile, learned_profile) values ($1, '{}', '{}')`, [A]));
    const upd = await as(B, (c) => c.query(`update public.taste_profiles set learned_profile = '{"hacked":true}' where user_id = $1`, [A]));
    const del = await as(B, (c) => c.query("delete from public.taste_answers where user_id = $1", [A]));
    expect(upd.rowCount).toBe(0);
    expect(del.rowCount).toBe(0);
  });

  it("erlaubt kein Umschreiben der eigenen user_id auf einen anderen Nutzer", async () => {
    await expect(as(A, (c) => c.query("update public.taste_answers set user_id = $1", [B]))).rejects.toThrow(/row-level security/);
  });

  it("Nutzer dürfen keine Scan-Ergebnisse selbst anlegen", async () => {
    await expect(
      as(A, (c) => c.query("insert into public.scan_items (scan_id, user_id, extracted_data) values ($1, $2, '{}')", [scanA, A])),
    ).rejects.toThrow(/permission denied/);
  });

  it("Scan-Ergebnisse können nicht an Scans fremder Nutzer gehängt werden (auch nicht vom Backend)", async () => {
    await expect(
      asService((c) => c.query("insert into public.scan_items (scan_id, user_id, extracted_data) values ($1, $2, '{}')", [scanB, A])),
    ).rejects.toThrow(/foreign key/);
  });

  it("verhindert Cross-User-Beziehungen bei gespeicherten Weinen", async () => {
    await expect(
      as(A, (c) => c.query("insert into public.user_wines (user_id, scan_item_id, wine_snapshot) values ($1, $2, '{}')", [A, itemB])),
    ).rejects.toThrow(/foreign key/);
  });

  it("verhindert Bewertungen für Weine anderer Nutzer", async () => {
    await expect(
      as(A, (c) => c.query("insert into public.wine_ratings (user_id, user_wine_id, verdict) values ($1, $2, 'loved')", [A, userWineB])),
    ).rejects.toThrow(/foreign key/);
  });

  it("Katalog-Weine sind lesbar, aber nicht von Nutzern beschreibbar", async () => {
    await asService((c) => c.query("insert into public.wines (catalog_key, name) values ('test|wine', 'Testwein')"));
    const read = await as(A, (c) => c.query("select count(*)::int as n from public.wines where catalog_key = 'test|wine'"));
    expect(read.rows[0].n).toBe(1);
    await expect(as(A, (c) => c.query("insert into public.wines (catalog_key, name) values ('x', 'x')"))).rejects.toThrow(/permission denied/);
    await expect(as(A, (c) => c.query("update public.wines set name = 'gehackt'"))).rejects.toThrow(/permission denied/);
    await asService((c) => c.query("delete from public.wines where catalog_key = 'test|wine'"));
  });

  it("Nutzer können den Katalogbezug eines Scan-Ergebnisses nicht verändern", async () => {
    await expect(as(A, (c) => c.query("update public.scan_items set wine_id = gen_random_uuid() where id = $1", [itemA]))).rejects.toThrow(
      /permission denied/,
    );
    const ok = await as(A, (c) => c.query(`update public.scan_items set extracted_data = '{"name":"Korrigiert"}' where id = $1`, [itemA]));
    expect(ok.rowCount).toBe(1);
  });

  it("Nutzer können den Analyse-Status nicht selbst setzen", async () => {
    await expect(as(A, (c) => c.query("insert into public.scans (user_id, scan_type, status) values ($1, 'bottle', 'analyzed')", [A]))).rejects.toThrow(
      /row-level security/,
    );
  });

  it("Bildpfade müssen im eigenen Ordner liegen", async () => {
    await expect(as(A, (c) => c.query("update public.scans set image_paths = array[$2 || '/' || $1 || '/0.jpg'] where id = $1", [scanA, B]))).rejects.toThrow(
      /owner folder|inside/,
    );
    const ok = await as(A, (c) => c.query("update public.scans set image_paths = array[$2 || '/' || $1 || '/0.jpg'], status='uploaded' where id = $1", [scanA, A]));
    expect(ok.rowCount).toBe(1);
  });

  it("KI-Nutzungsdaten sind nicht manipulierbar", async () => {
    await expect(as(A, (c) => c.query("insert into public.ai_usage (user_id, function_name) values ($1, 'analyze-wine-image')", [A]))).rejects.toThrow(
      /permission denied/,
    );
    await expect(as(A, (c) => c.query("delete from public.ai_usage"))).rejects.toThrow(/permission denied/);
  });

  it("Storage: nur eigene Ordner im privaten Bucket", async () => {
    await as(A, (c) => c.query("insert into storage.objects (bucket_id, name) values ('wine-scans', $1)", [`${A}/${scanA}/0.jpg`]));
    await expect(
      as(A, (c) => c.query("insert into storage.objects (bucket_id, name) values ('wine-scans', $1)", [`${B}/${scanB}/0.jpg`])),
    ).rejects.toThrow(/row-level security/);
    const seenByB = await as(B, (c) => c.query("select count(*)::int as n from storage.objects where bucket_id = 'wine-scans'"));
    expect(seenByB.rows[0].n).toBe(0);
    const bucket = await pool.query("select public from storage.buckets where id = 'wine-scans'");
    expect(bucket.rows[0].public).toBe(false);
  });

  it("nicht angemeldete Anfragen (anon) erhalten keinen Zugriff", async () => {
    await expect(as(null, (c) => c.query("select * from public.profiles"), "anon")).rejects.toThrow(/permission denied/);
  });

  it("Löschen des Nutzers entfernt alle persönlichen Daten (Kaskade)", async () => {
    const C = randomUUID();
    await pool.query("insert into auth.users (id) values ($1)", [C]);
    await as(C, (c) => c.query(`insert into public.taste_answers (user_id, question_key, answer) values ($1, 'q1_sweetness', '{"value":"dry"}')`, [C]));
    await pool.query("delete from auth.users where id = $1", [C]);
    const left = await pool.query(
      "select (select count(*) from public.profiles where user_id = $1) + (select count(*) from public.taste_answers where user_id = $1) as n",
      [C],
    );
    expect(Number(left.rows[0].n)).toBe(0);
  });

  it("gespeicherte Weine bleiben erhalten, wenn der zugehörige Scan gelöscht wird", async () => {
    await as(B, (c) => c.query("delete from public.scans where id = $1", [scanB]));
    const r = await as(B, (c) => c.query("select scan_item_id, wine_snapshot from public.user_wines where id = $1", [userWineB]));
    expect(r.rows[0]).toEqual({ scan_item_id: null, wine_snapshot: { name: "B" } });
  });
});
