# Nächste Schritte (Stand: 18.10.2026, abends)

## Erledigt
- [x] Code auf GitHub: `niklasxo/san-vino` (Branch `main`)
- [x] Supabase-Projekt **san-vino** (`vbleskoyqyukokkutdnx`, Frankfurt) angelegt – Projekt „uss“ NICHT anfassen (gehört zu us-app)
- [x] Migrationen 001–005 eingespielt (005 = Fremdschlüssel-Indizes), Security Advisor ohne Befund, RLS per SQL mit zwei Testnutzern geprüft
- [x] Edge Functions deployt: `analyze-wine-image`, `generate-wine-explanation`, `delete-my-data` (verify_jwt = false, Auth im Code)
- [x] Anonyme Anmeldung von Niklas eingeschaltet (Auth-Log 21:16 „reloading api with new configuration“) – **beim ersten App-Start bestätigen**
- [x] `.claude/settings.json` mit dauerhaften Freigaben
- [x] KI auf Google Gemini (kostenlos) umgestellt (Modell `gemini-flash-latest`). Deployt: `analyze-wine-image` v3 (aktueller Stand),
  `generate-wine-explanation` v2 (älterer Gemini-Fallback – beim nächsten Deploy mitziehen), `delete-my-data` v1
- [x] Klickbare Demo (Demo-Modus, Einzeldatei): https://claude.ai/artifact/F9Lrfn3s3dxithbj4iieSX – neu bauen mit `npm run build:demo`
- [x] GitHub Actions CI: Typecheck, Tests, Build, Deno-Check, RLS-Tests bei jedem Push

## Offen – morgen am Computer
0. **KI-Anbieter entschieden:** Google Gemini (kostenloser Tarif, kein Geld). OpenAI bleibt optional (`AI_PROVIDER`).
1. **Gemini-Key (kostenlos)** holen: https://aistudio.google.com/apikey → in Supabase eintragen (nicht im Chat!):
   https://supabase.com/dashboard/project/vbleskoyqyukokkutdnx/functions/secrets → `GEMINI_API_KEY`
2. **Vercel-Projekt anlegen** – MCP bekam 403 (Vercel hat keinen Zugriff auf GitHub-Konto `niklasxo`):
   https://vercel.com/new → GitHub-Zugriff für `san-vino` erlauben → `niklasxo/san-vino` importieren → Vite
   Environment Variables:
   - `VITE_SUPABASE_URL` = `https://vbleskoyqyukokkutdnx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_QAU8drkj1USTAPIvhMHUuA_-P86zVsy`
   - `VITE_DEMO_MODE` = `false`
   (Vercel-Team: `team_yMgUw3uDonnW1PY53wPLY6rK`, dort existiert auch Projekt „us-app“ – nicht anfassen)
3. Danach prüfen (Claude): Vercel-Build, App öffnen, anonyme Anmeldung, Onboarding, erster echter Flaschen-Scan,
   Edge-Function-Logs in Supabase, ggf. `VINO_ALLOWED_ORIGINS` auf die Vercel-Domain setzen.
4. Später: Cloudflare (Domain / Turnstile-CAPTCHA für anonyme Anmeldungen), Repo ggf. auf privat stellen.

## Hinweise
- Edge Functions werden über das Supabase-MCP-Tool deployt (Dateien inkl. `../_shared` und `../_server` mitschicken),
  weil die Cloud-Umgebung supabase.co nicht direkt erreicht.
- Änderungen an `supabase/functions/_shared` → alle Functions neu deployen.

## Stand 18.10. spät – alles live & getestet
- App: https://san-vino.vercel.app (Vercel-Projekt `san-vino`, Auto-Deploy bei Push auf `main`)
- Gemini-Key gesetzt, Modell löst auf `gemini-3.8-flash` auf. Gemessen: Flasche ~10 s, Weinkarte (6 Weine) ~17–19 s
- Deployt: `analyze-wine-image` v5, `generate-wine-explanation` v4 (beide mit wenig Nachdenken), `delete-my-data` v1
- Vercel-MCP: Projekt sichtbar, Details/Deployments → 403 (Scope `niklasxo`). Build-Status über GitHub-Commit-Status prüfen.

## Stand 19.10.
- [x] `other_details` aus dem KI-Ausgabeschema entfernt.
- [x] Überlast-Schutz: Gemini meldete 503 „high demand“ und hing 60–115 s → jetzt startet parallel das Ausweichmodell
      `gemini-flash-lite-latest` (nach 30 s Karte / 15 s Flasche / 12 s Erklärung oder sofort bei 503).
      Abschalten: Secret `GEMINI_FALLBACK_MODEL=none`. Deployt: `analyze-wine-image` v6, `generate-wine-explanation` v5
      (per Vergleich mit dem Repo geprüft).
- [x] Ziel ≤ 15 s: Fotos laufen jetzt auf `gemini-flash-lite-latest` (14 Weine in ~12 s), Flash läuft bei Karten
      sofort parallel, bei Flaschen nach 4 s. Countdown-Kreis (15 s) beim Analysieren. Live: `analyze-wine-image` v7.
      `generate-wine-explanation` noch v5 (Ausweichmodell nach 12 statt 8 s) – beim nächsten Deploy mitnehmen.
- [x] Erklärung zum besten Treffer wird auf der Ergebnisseite im Hintergrund vorgeladen.
- [x] PWA-Vorabcache von 2,45 MB auf 1,36 MB verkleinert (große Icons nicht mehr vorab laden).

- [x] Weinkarte schneller (`analyze-wine-image` v8, per Vergleich mit dem Repo geprüft):
      kompaktes KI-Format (`_shared/compact-analysis.ts`, ~3,3× weniger Ausgabe), Server parallel
      (Bilder, Profil, Katalog, Nutzungsprotokoll), gespeicherte Zeilen direkt zurück.
      App: Fotos werden schon in der Vorschau hochgeladen; Scan-ID im Browser; „Letzte Scans“ lädt im Hintergrund.
      Gemessen 19.10. 07:09: Karte mit 14 Weinen **11,4 s gesamt**, KI 6,7 s (out 2.947 statt 6.250 Tokens).
- [x] Kaltstart (~3,3 s gemessen) vermeiden: App weckt `analyze-wine-image` beim Öffnen des Scanners und
      `generate-wine-explanation` während der Analyse (OPTIONS-Anfrage, `src/lib/supabase/warm-up.ts`).
- [x] Erklärung: Flash-Lite springt nach 2,5 s ein (vorher 12 s) – `generate-wine-explanation` v6.

## Nächste Tempo-Ideen (nicht umgesetzt)
0. Streaming: Weine erscheinen nacheinander, sobald die KI sie gelesen hat (größter gefühlter Gewinn).
1. `evidence` kompakter → weniger Ausgabe-Tokens (Ausgabe dominiert die Dauer).
2. Bildanalyse streamen (`streamGenerateContent`) und Weine nacheinander anzeigen.
3. Erklärung schon im Hintergrund vorladen, sobald das Ergebnis da ist.
4. Für reine Flaschen-Scans ggf. `gemini-flash-lite-latest` testen (Secret `GEMINI_MODEL`).

## Kosten: alles 0 €
- Gemini API: kostenloser Tarif (Limits pro Minute/Tag; Google darf Gratis-Anfragen zur Verbesserung nutzen)
- Supabase Free: kostenlos, pausiert das Projekt nach ca. 1 Woche ohne Nutzung (im Dashboard wieder starten)
- Vercel Hobby: kostenlos für private, nicht-kommerzielle Nutzung
