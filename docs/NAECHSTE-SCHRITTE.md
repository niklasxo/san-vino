# Nächste Schritte (Stand: 18.10.2026, abends)

## Erledigt
- [x] Code auf GitHub: `niklasxo/san-vino` (Branch `main`)
- [x] Supabase-Projekt **san-vino** (`vbleskoyqyukokkutdnx`, Frankfurt) angelegt – Projekt „uss“ NICHT anfassen (gehört zu us-app)
- [x] Migrationen 001–004 eingespielt, Security Advisor ohne Befund, RLS per SQL mit zwei Testnutzern geprüft
- [x] Edge Functions deployt: `analyze-wine-image`, `generate-wine-explanation`, `delete-my-data` (verify_jwt = false, Auth im Code)
- [x] Anonyme Anmeldung von Niklas eingeschaltet (Auth-Log 21:16 „reloading api with new configuration“) – **beim ersten App-Start bestätigen**
- [x] `.claude/settings.json` mit dauerhaften Freigaben
- [x] KI auf Google Gemini (kostenlos) umgestellt, beide KI-Functions als Version 2 deployt (Modell `gemini-flash-latest`)

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

## Kosten: alles 0 €
- Gemini API: kostenloser Tarif (Limits pro Minute/Tag; Google darf Gratis-Anfragen zur Verbesserung nutzen)
- Supabase Free: kostenlos, pausiert das Projekt nach ca. 1 Woche ohne Nutzung (im Dashboard wieder starten)
- Vercel Hobby: kostenlos für private, nicht-kommerzielle Nutzung
