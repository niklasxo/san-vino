/**
 * Unsichtbare anonyme Anmeldung.
 * - Vorhandene Sitzung wird wiederverwendet (keine neue Identität pro Seitenaufruf).
 * - Nur wenn keine Sitzung existiert, wird einmalig signInAnonymously() aufgerufen.
 * - Parallele Aufrufe teilen sich dasselbe Promise.
 *
 * Später: Ein anonymes Konto kann per supabase.auth.updateUser({ email }) bzw.
 * linkIdentity() in ein dauerhaftes Konto umgewandelt werden – die user_id und
 * damit alle Daten bleiben erhalten.
 */
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";

let pending: Promise<Session> | null = null;

export class SessionError extends Error {
  constructor(public reason: "offline" | "anonymous_disabled" | "unreachable" | "unknown", message?: string) {
    super(message ?? reason);
  }
}

export function ensureAnonymousSession(): Promise<Session> {
  pending ??= (async () => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getSession();
    if (!error && data.session) return data.session;

    if (typeof navigator !== "undefined" && navigator.onLine === false) throw new SessionError("offline");

    const res = await supabase.auth.signInAnonymously();
    if (res.error || !res.data.session) {
      const msg = res.error?.message ?? "";
      if (/anonymous/i.test(msg) && /disabled|not enabled/i.test(msg)) throw new SessionError("anonymous_disabled", msg);
      if (/fetch|network/i.test(msg)) throw new SessionError("unreachable", msg);
      throw new SessionError("unknown", msg);
    }
    return res.data.session;
  })().catch((err) => {
    pending = null; // erneuter Versuch möglich
    throw err;
  });
  return pending;
}

export async function currentUserId(): Promise<string> {
  const session = await ensureAnonymousSession();
  return session.user.id;
}
