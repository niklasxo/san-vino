/** Zentrale Laufzeitkonfiguration (nur öffentliche Werte!). */
const env = import.meta.env;

const DEMO_FLAG_KEY = "vino-demo-mode";

function readDemoFlag(): boolean {
  if (env.VITE_DEMO_MODE === "true") return true;
  try {
    return sessionStorage.getItem(DEMO_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export const config = {
  supabaseUrl: (env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "",
  supabaseAnonKey: (env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? "",
  demoMode: readDemoFlag(),
};

export const isSupabaseConfigured =
  /^https?:\/\//.test(config.supabaseUrl) && config.supabaseAnonKey.length > 20 && !config.supabaseUrl.includes("DEIN-PROJEKT");

/** Demo-Modus nur für die aktuelle Browser-Sitzung aktivieren (keine Nutzerdaten). */
export function enableDemoMode() {
  try {
    sessionStorage.setItem(DEMO_FLAG_KEY, "1");
  } catch {
    /* ignore */
  }
  window.location.assign("/");
}

export function disableDemoMode() {
  try {
    sessionStorage.removeItem(DEMO_FLAG_KEY);
  } catch {
    /* ignore */
  }
  window.location.assign("/");
}
