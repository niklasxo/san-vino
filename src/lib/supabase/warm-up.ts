import { config } from "@/lib/config";

const lastWarm = new Map<string, number>();

/**
 * Weckt eine Edge Function vorab (Kaltstart ~3 s gemessen), damit sie bereit ist, wenn der Nutzer
 * tippt. Eine OPTIONS-Anfrage wird von der Function sofort beantwortet und kostet keine KI-Aufrufe.
 */
export function warmUpFunction(name: "analyze-wine-image" | "generate-wine-explanation") {
  if (config.demoMode || !config.supabaseUrl) return;
  const now = Date.now();
  if (now - (lastWarm.get(name) ?? 0) < 60_000) return;
  lastWarm.set(name, now);
  void fetch(`${config.supabaseUrl}/functions/v1/${name}`, { method: "OPTIONS" }).catch(() => undefined);
}
