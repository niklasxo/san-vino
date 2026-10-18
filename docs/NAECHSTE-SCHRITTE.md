# Nächste Schritte (Stand: 18.10.2026, abends)

## Erledigt
- [x] Code auf GitHub: `niklasxo/san-vino` (Branch `main`)
- [x] Supabase-Projekt **san-vino** (`vbleskoyqyukokkutdnx`, Frankfurt) angelegt – Projekt „uss“ NICHT anfassen (gehört zu us-app)
- [x] Migrationen 001–004 eingespielt, Security Advisor ohne Befund, RLS per SQL mit zwei Testnutzern geprüft
- [x] Edge Functions deployt: `analyze-wine-image`, `generate-wine-explanation`, `delete-my-data` (verify_jwt = false, Auth im Code)
- [x] Anonyme Anmeldung von Niklas eingeschaltet (Auth-Log 21:16 „reloading api with new configuration“) – **beim ersten App-Start bestätigen**
- [x] `.claude/settings.json` mit dauerhaften Freigaben

## Offen – morgen am Computer
0. **Entscheidung KI-Anbieter:** Niklas hat kein OpenAI-/API-Konto. Variante A: OpenAI-API-Konto anlegen
   (platform.openai.com, Guthaben + Monatslimit). Variante B: auf Anthropic Claude API umbauen
   (nur `supabase/functions/_server/openai.ts` + Modell-Secrets betroffen). Empfehlung: A.
1. **OpenAI-Key** in Supabase eintragen (nicht im Chat!):
   https://supabase.com/dashboard/project/vbleskoyqyukokkutdnx/functions/secrets → `OPENAI_API_KEY`
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
