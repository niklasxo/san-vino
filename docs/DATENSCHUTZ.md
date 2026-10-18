# Datenflüsse & Datenschutz (Grundlage für die spätere Datenschutzerklärung)

> Kein Rechtsrat – diese Übersicht dokumentiert technisch, welche Daten wohin fließen.

| Daten | Wo gespeichert | Wer kann zugreifen | Externer Empfänger |
|---|---|---|---|
| Anonyme Nutzer-ID + Sitzungstoken | Supabase Auth; Token im `localStorage` des Browsers (`vino-session`) | nur der Nutzer | – |
| 10 Antworten, Geschmacksprofil | Supabase Postgres (`taste_answers`, `taste_profiles`) | nur der Nutzer (RLS) | – |
| Fotos von Etiketten/Weinkarten | Supabase Storage, privater Bucket, ohne EXIF/GPS | nur der Nutzer (RLS), Edge Function | **OpenAI** (zur Analyse; `store: false`) |
| Erkannte Weine, Scores, Erklärungen | Supabase (`scans`, `scan_items`) | nur der Nutzer | Geschmacksprofil (zusammengefasst) + Weindaten an **OpenAI** für Erklärungen |
| Gespeicherte Weine, Bewertungen, Notizen | Supabase (`user_wines`, `wine_ratings`) | nur der Nutzer | – |
| Sicher identifizierte Weine (ohne Personenbezug) | Supabase `wines` (gemeinsamer Katalog) | alle angemeldeten Nutzer lesend | – |
| KI-Nutzungszähler | Supabase `ai_usage` | Nutzer lesend, nur Server schreibt | – |

**Hinweise**
- Weinkarten-Fotos können unbeabsichtigt Personen oder andere Inhalte zeigen. Bilder werden nur für die Analyse
  verwendet, nur im privaten Bucket gespeichert und können pro Scan (Papierkorb-Symbol) oder komplett
  (*Mein Geschmack → Alle meine Daten löschen*) gelöscht werden.
- Es werden keine Bildinhalte oder API-Schlüssel geloggt.
- Schriften werden lokal ausgeliefert (kein Google-Fonts-Aufruf).
- Vor Veröffentlichung: Auftragsverarbeitungsverträge mit Supabase und OpenAI, Serverregion EU wählen,
  Datenschutzerklärung & Impressum ergänzen, Speicherdauer für Fotos festlegen (z. B. automatische Löschung nach X Tagen).
