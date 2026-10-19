/**
 * Sitzungsspeicher mit Sicherheitsnetz.
 *
 * Supabase liest die Sitzung bei JEDER Anfrage aus dem Speicher. In manchen Safari-Konfigurationen
 * (privates Surfen, strenge Tracking-Einstellungen, iCloud Private Relay) schlägt localStorage fehl
 * oder verliert Einträge – dann gingen Anfragen ohne Anmeldung raus (beobachtet: 401 beim Speichern
 * des Onboardings). Deshalb: immer zusätzlich im Arbeitsspeicher halten und bei Bedarf von dort lesen.
 */
export interface SimpleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStorage(): SimpleStorage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null; // Zugriff verboten (z. B. „Alle Cookies blockieren“)
  }
}

export function createResilientStorage(persistent: SimpleStorage | null = browserStorage()): SimpleStorage {
  const memory = new Map<string, string>();
  return {
    getItem(key) {
      let stored: string | null = null;
      try {
        stored = persistent?.getItem(key) ?? null;
      } catch {
        /* Speicher nicht lesbar → Arbeitsspeicher */
      }
      if (stored !== null) {
        memory.set(key, stored);
        return stored;
      }
      return memory.get(key) ?? null;
    },
    setItem(key, value) {
      memory.set(key, value);
      try {
        persistent?.setItem(key, value);
      } catch {
        /* z. B. Speicher voll / privates Surfen – Arbeitsspeicher reicht für diese Sitzung */
      }
    },
    removeItem(key) {
      memory.delete(key);
      try {
        persistent?.removeItem(key);
      } catch {
        /* ignorieren */
      }
    },
  };
}
