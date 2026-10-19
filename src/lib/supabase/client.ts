import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config, isSupabaseConfigured } from "@/lib/config";
import { createResilientStorage } from "./resilient-storage";

let client: SupabaseClient | null = null;

/**
 * Browser-Client mit dem öffentlichen anon/publishable Key.
 * Der Service-Role-Key existiert ausschließlich serverseitig in Edge Functions.
 */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) throw new Error("Supabase ist nicht konfiguriert");
  client ??= createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      // Nur das Sitzungs-Token wird im Browser gehalten, damit die anonyme
      // Identität beim nächsten Besuch wiederverwendet wird. Alle Nutzerdaten
      // liegen ausschließlich in Supabase.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "vino-session",
      // Fällt localStorage aus oder verliert Einträge, bleibt die Sitzung im Arbeitsspeicher erhalten.
      storage: createResilientStorage(),
    },
  });
  return client;
}
