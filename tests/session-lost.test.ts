import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { createResilientStorage, type SimpleStorage } from "@/lib/supabase/resilient-storage";

// Nachbau des Vorfalls: Safari „vergisst“ den gespeicherten Sitzungseintrag.
const forgetful: SimpleStorage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };

function fakeSupabase() {
  const seenAuth: string[] = [];
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    if (url.includes("/auth/v1/signup")) {
      const now = Math.floor(Date.now() / 1000);
      const user = { id: "user-123", aud: "authenticated", role: "authenticated", is_anonymous: true, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
      return new Response(JSON.stringify({ access_token: "user-jwt", refresh_token: "r1", expires_in: 3600, expires_at: now + 3600, token_type: "bearer", user }), { status: 200, headers: { "content-type": "application/json" } });
    }
    seenAuth.push(headers.get("Authorization") ?? "");
    return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
  };
  return { fetch, seenAuth };
}

async function run(storage: SimpleStorage) {
  const { fetch, seenAuth } = fakeSupabase();
  const sb = createClient("https://example.supabase.co", "sb_publishable_test", {
    auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "vino-session", storage },
    global: { fetch: fetch as typeof globalThis.fetch },
  });
  const { error } = await sb.auth.signInAnonymously();
  expect(error).toBeNull();
  await sb.from("user_wines").select("*");
  return seenAuth[0];
}

describe("Vorfall: Sitzung geht im Browser-Speicher verloren", () => {
  it("ohne Sicherheitsnetz geht die Anfrage OHNE Anmeldung raus (so ist es passiert)", async () => {
    expect(await run(forgetful)).toBe("Bearer sb_publishable_test");
  });

  it("mit Sicherheitsnetz wird die Anmeldung des Nutzers mitgeschickt", async () => {
    expect(await run(createResilientStorage(forgetful))).toBe("Bearer user-jwt");
  });
});
