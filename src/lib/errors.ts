/** Übersetzt technische Fehler in freundliche, verständliche Sätze. */
export class AppError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
  }
}

const MESSAGES: Record<string, { title: string; text: string }> = {
  offline: { title: "Keine Internetverbindung", text: "Prüf kurz dein WLAN oder deine mobilen Daten und versuch es dann noch einmal." },
  unreachable: { title: "Verbindung gerade nicht möglich", text: "Unser Server antwortet gerade nicht. Versuch es gleich noch einmal." },
  rate_limited: { title: "Kurze Pause", text: "Du hast heute schon sehr viele Weine gescannt. Morgen geht es weiter – deine gespeicherten Weine sind natürlich weiter da." },
  already_running: { title: "Wir sind schon dabei", text: "Dieses Foto wird gerade analysiert. Einen Moment noch …" },
  image_invalid: { title: "Das Foto konnte nicht gelesen werden", text: "Bitte nimm ein neues Foto auf – am besten als JPEG oder PNG." },
  image_too_large: { title: "Das Foto ist zu groß", text: "Bitte versuch es mit einem kleineren Foto." },
  ai_unavailable: { title: "Unser Sommelier ist kurz abgelenkt", text: "Die Analyse hat gerade nicht geklappt. Versuch es bitte noch einmal." },
  ai_invalid_response: { title: "Das hat nicht ganz geklappt", text: "Die Analyse war unvollständig. Versuch es bitte noch einmal – gerne mit einem schärferen Foto." },
  ai_refused: { title: "Das Foto können wir nicht auswerten", text: "Bitte fotografiere ein Weinetikett oder eine Weinkarte." },
  not_configured: { title: "KI noch nicht eingerichtet", text: "Der OpenAI-Schlüssel fehlt in den Supabase Secrets. Details stehen in der README." },
  unauthorized: { title: "Sitzung abgelaufen", text: "Lade die Seite bitte neu." },
  not_found: { title: "Nicht gefunden", text: "Diesen Eintrag gibt es nicht (mehr)." },
  function_missing: { title: "Analyse-Dienst nicht erreichbar", text: "Die Edge Function ist noch nicht bereitgestellt. Siehe README → Edge Functions." },
  upload_failed: { title: "Upload fehlgeschlagen", text: "Das Foto konnte nicht hochgeladen werden. Prüf deine Verbindung und versuch es erneut." },
};

const FALLBACK = { title: "Da ist etwas schiefgelaufen", text: "Versuch es bitte noch einmal." };

export function describeError(err: unknown): { title: string; text: string; code: string } {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return { ...MESSAGES.offline, code: "offline" };
  const code = err instanceof AppError ? err.code : (err as { reason?: string })?.reason ?? "unknown";
  return { ...(MESSAGES[code] ?? FALLBACK), code };
}
