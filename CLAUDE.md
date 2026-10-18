# SAN VINO – Hinweise für Claude

- Sprache mit dem Nutzer: Deutsch, du-Form. UI-Texte ausschließlich Deutsch.
- **Zuerst lesen:** `docs/NAECHSTE-SCHRITTE.md` (offene Aufgaben & Projekt-IDs).
- Architektur: `docs/ARCHITEKTUR.md`, Einrichtung: `README.md`.
- Vor jedem Commit: `npm run typecheck && npm test && npm run build`.
- Matching-Logik nur in `supabase/functions/_shared/matching.ts` ändern (Frontend + Server teilen sie).
- Nichts veröffentlichen oder Domains kaufen ohne ausdrückliche Freigabe.
