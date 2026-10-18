# 🍷 SAN VINO – dein persönlicher KI-Wein-Sommelier

SAN VINO findet heraus, was **dir** schmeckt – mit zehn einfachen Fragen ohne Fachwissen – und sagt dir dann
für jede fotografierte Flasche oder Weinkarte, wie gut ein Wein zu deinem Geschmack passt.
Nicht der teuerste oder bekannteste Wein gewinnt, sondern der, der am besten zu dir passt.

**Stack:** React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · shadcn/ui-Muster (Radix, vaul, sonner) · Lucide ·
Motion · React Router 7 · TanStack Query 5 · React Hook Form · Zod 4 · Supabase (Postgres, Anonymous Auth,
RLS, Storage, Edge Functions) · OpenAI Responses API (multimodal, Structured Outputs) · Vitest · Testing Library · PWA

---

## Inhalt
1. [Benötigte Software](#1-benötigte-software)
2. [Installation](#2-installation)
3. [Supabase einrichten](#3-supabase-einrichten)
4. [Einstellungen in Supabase](#4-einstellungen-in-supabase)
5. [Datenbankmigrationen ausführen](#5-datenbankmigrationen-ausführen)
6. [Storage](#6-storage)
7. [Anonymous Auth aktivieren](#7-anonymous-auth-aktivieren)
8. [OpenAI API-Key sicher hinterlegen](#8-openai-api-key-sicher-hinterlegen)
9. [Edge Functions bereitstellen / lokal testen](#9-edge-functions-bereitstellen--lokal-testen)
10. [App lokal starten](#10-app-lokal-starten)
11. [Auf dem Smartphone im WLAN testen](#11-auf-dem-smartphone-im-wlan-testen)
12. [Änderungen vornehmen](#12-änderungen-vornehmen)
13. [Später veröffentlichen](#13-später-veröffentlichen)
14. [Tests](#14-tests) · [Demo-Modus](#demo-modus) · [Was ist getestet?](#was-ist-getestet--was-nicht)

---

## 1. Benötigte Software

| Software | Version | Wofür |
|---|---|---|
| [Node.js](https://nodejs.org) | **22 LTS** oder neuer | Frontend, Tests, Supabase CLI (über `npx`) |
| Git | aktuell | Versionsverwaltung |
| Supabase-Konto | kostenlos | Datenbank, Auth, Storage, Edge Functions |
| OpenAI-Konto mit API-Key | – | Bilderkennung & Erklärungen |
| *optional* Docker Desktop | aktuell | nur für `supabase functions serve` / `supabase start` lokal |
| *optional* [Deno](https://deno.com) 2 | aktuell | Typprüfung der Edge Functions (`npm run check:functions`) |

## 2. Installation

```bash
git clone <dein-repo> vino
cd vino
npm install
cp .env.example .env.local      # danach Werte eintragen (Schritt 3)
```

## 3. Supabase einrichten

1. Auf <https://supabase.com/dashboard> **New project** anlegen (Region z. B. *Frankfurt – eu-central-1*). Datenbank-Passwort notieren.
2. **Project Settings → API** (bzw. *API Keys*) öffnen und kopieren:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / publishable key** → `VITE_SUPABASE_ANON_KEY`
3. In `.env.local` eintragen:
   ```env
   VITE_SUPABASE_URL=https://abcdefghijk.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...      # oder sb_publishable_...
   ```
   > Der anon-Key ist öffentlich und darf im Browser stehen – er ist durch Row Level Security geschützt.
   > Den **service_role**-Key niemals in `.env.local` oder ins Frontend kopieren.
4. Supabase CLI mit dem Projekt verbinden (Project-Ref = der Teil vor `.supabase.co`):
   ```bash
   npx supabase login
   npx supabase link --project-ref abcdefghijk
   ```

## 4. Einstellungen in Supabase

| Wo im Dashboard | Einstellung |
|---|---|
| Authentication → Sign In / Providers | **Allow anonymous sign-ins: an** (siehe Schritt 7) |
| Authentication → Rate Limits | Anonyme Anmeldungen pro Stunde/IP begrenzen (z. B. 30) |
| Authentication → URL Configuration | Site URL `http://localhost:5173` (später deine Domain) |
| Edge Functions → Secrets | OpenAI-Key & Limits (Schritt 8) |
| *später, vor Veröffentlichung* | Authentication → Attack Protection → **CAPTCHA (Cloudflare Turnstile)** gegen Massen-Anmeldungen |

## 5. Datenbankmigrationen ausführen

Alle Tabellen, Constraints, Indizes, RLS-Policies und der Storage-Bucket liegen in `supabase/migrations/`:

| Datei | Inhalt |
|---|---|
| `…001_core_schema.sql` | Tabellen `profiles`, `taste_answers`, `taste_profiles`, `scans`, `wines`, `scan_items`, `user_wines`, `wine_ratings`, `ai_usage`, Trigger |
| `…002_row_level_security.sql` | RLS für alle Tabellen, Eigentümer-Prüfungen, Spaltenrechte |
| `…003_storage.sql` | Privater Bucket `wine-scans` + Storage-Policies |

```bash
npx supabase db push
```

Alternative ohne CLI: Inhalt der drei Dateien **der Reihe nach** im Dashboard unter *SQL Editor* ausführen.

## 6. Storage

Wird durch Migration 003 automatisch angelegt – du musst nichts klicken. Prüfen unter **Storage → Buckets**:
`wine-scans` ist **privat**, max. 6 MB, nur JPEG/PNG/WebP. Pfade: `<user_id>/<scan_id>/<n>.jpg`.
Nutzer sehen nur ihren eigenen Ordner; Bilder werden in der App nur über kurzlebige signierte URLs angezeigt.

## 7. Anonymous Auth aktivieren

Dashboard → **Authentication → Sign In / Providers** → *User Signups* → **Allow anonymous sign-ins** einschalten → *Save*.

Beim ersten App-Start meldet VINO den Nutzer unsichtbar anonym an. Die Sitzung wird im Browser gehalten und beim
nächsten Besuch wiederverwendet. Ist die Option aus, zeigt die App eine klare Fehlermeldung mit genau diesem Hinweis.

> **Wichtig:** Eine anonyme Identität ist an diesen Browser gebunden. Löscht der Nutzer die Website-Daten, ist der
> Zugang zu seinen Daten weg. Die Architektur ist für eine spätere Kontoverknüpfung vorbereitet
> (`supabase.auth.updateUser({ email })` bzw. `linkIdentity()` – die `user_id` und damit alle Daten bleiben erhalten).

## 8. OpenAI API-Key sicher hinterlegen

Der Key liegt **ausschließlich** in den Supabase Secrets und wird nur in Edge Functions gelesen.

```bash
cp supabase/functions/.env.example supabase/functions/.env   # Werte eintragen (Datei wird nicht committet)
npx supabase secrets set --env-file supabase/functions/.env
```

oder im Dashboard: **Edge Functions → Secrets → Add new secret**.

| Secret | Pflicht | Standard | Bedeutung |
|---|---|---|---|
| `OPENAI_API_KEY` | ✅ | – | dein OpenAI-Key |
| `OPENAI_MODEL` | | `gpt-5-mini` | multimodales Modell für Bild + Text. Für schwierige Weinkarten ggf. ein größeres Modell. |
| `OPENAI_EXPLANATION_MODEL` | | = `OPENAI_MODEL` | Modell für Erklärungstexte |
| `OPENAI_REASONING_EFFORT` | | `low` | nur für Reasoning-Modelle (gpt-5*, o*) |
| `VINO_DAILY_SCAN_LIMIT` | | `25` | Bildanalysen pro Nutzer & 24 h (Kostenschutz) |
| `VINO_DAILY_EXPLANATION_LIMIT` | | `80` | Erklärungen pro Nutzer & 24 h |
| `VINO_ALLOWED_ORIGINS` | | `*` | erlaubte Origins (CORS), komma-separiert |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` und `SUPABASE_SERVICE_ROLE_KEY` stellt Supabase den Functions automatisch bereit.

**Kosten-Tipp:** Lege im OpenAI-Dashboard unter *Limits* ein monatliches Budget fest.

## 9. Edge Functions bereitstellen / lokal testen

| Function | Aufgabe |
|---|---|
| `analyze-wine-image` | Foto(s) prüfen → KI-Erkennung → Zod-Validierung → Matching → speichern. Idempotent (keine doppelten Kosten). Modus `reestimate` nach Korrekturen. |
| `generate-wine-explanation` | Persönliche Erklärung. Score wird serverseitig berechnet; die KI darf ihn nicht ändern. Gecacht pro Profilversion. |
| `delete-my-data` | Löscht Fotos + Konto inkl. aller Daten (Kaskade). |

**Empfohlen für die lokale Entwicklung: in der Cloud bereitstellen** (Frontend läuft lokal, Functions in Supabase):

```bash
npx supabase functions deploy analyze-wine-image
npx supabase functions deploy generate-wine-explanation
npx supabase functions deploy delete-my-data
```

Typprüfung ohne Deploy: `npm run check:functions` (benötigt Deno).

*Optional komplett lokal* (benötigt Docker): `npx supabase start`, dann `npx supabase functions serve --env-file supabase/functions/.env`
und in `.env.local` die lokale URL/Keys aus `npx supabase status` eintragen.

## 10. App lokal starten

```bash
npm install
npm run dev
```

→ <http://localhost:5173>. Ohne Supabase-Zugangsdaten erscheint eine Einrichtungsseite mit der Option *Demo-Modus starten*.

## 11. Auf dem Smartphone im WLAN testen

1. Computer und Smartphone im selben WLAN.
2. `npm run dev:host` – Vite zeigt eine Adresse wie `http://192.168.178.23:5173`.
3. Diese Adresse am Smartphone öffnen. Kamera-Upload funktioniert über den normalen Foto-Dialog.
4. Hast du `VINO_ALLOWED_ORIGINS` gesetzt, die WLAN-Adresse dort ergänzen und Secrets neu setzen.
5. Firewall-Abfrage am Computer ggf. erlauben (Port 5173).

> Hinweis: Die „Zum Home-Bildschirm hinzufügen“-PWA-Installation benötigt HTTPS und funktioniert daher erst nach der Veröffentlichung (oder via `npm run build && npm run preview` mit HTTPS-Tunnel).

## 12. Änderungen vornehmen

| Was | Wo |
|---|---|
| Farben, Schriften, Radien | `src/styles/index.css` (`@theme`-Tokens) |
| Fragen des Onboardings | `src/lib/taste-profile/questions.ts` |
| Antwort → Profil-Berechnung | `src/lib/taste-profile/compute.ts` |
| Geschmackstypen | `src/lib/taste-profile/taste-type.ts` |
| Matching (Gewichte, Kategorien) | `supabase/functions/_shared/matching.ts` (Frontend **und** Server) |
| Lernen aus Bewertungen | `src/lib/taste-profile/learning.ts` |
| KI-Prompts / Schemas | `supabase/functions/_shared/prompts.ts`, `wine-schema.ts` |
| Datenbank | **neue** Datei in `supabase/migrations/` anlegen (`npx supabase migration new name`), dann `npx supabase db push` |

Nach Änderungen an `_shared/` oder Functions: Functions neu deployen. Vor jedem Commit: `npm test && npm run build`.
Mehr zur Struktur: [`docs/ARCHITEKTUR.md`](docs/ARCHITEKTUR.md).

## 13. Später veröffentlichen

*(Erst nach deiner ausdrücklichen Freigabe.)* Die App ist ein statisches SPA-Frontend + Supabase-Backend.

**Vercel:** Repository importieren → Framework *Vite* → Build `npm run build`, Output `dist` →
Environment Variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` setzen. `vercel.json` (SPA-Rewrites) ist vorhanden.

Checkliste vor dem Livegang:
- [ ] Supabase Site URL / Redirect URLs auf die Domain setzen, `VINO_ALLOWED_ORIGINS` auf die Domain beschränken
- [ ] CAPTCHA für anonyme Anmeldungen aktivieren, Auth-Rate-Limits prüfen
- [ ] Tageslimits & OpenAI-Budget festlegen
- [ ] Datenschutzerklärung & Impressum (Vorlage der Datenflüsse: [`docs/DATENSCHUTZ.md`](docs/DATENSCHUTZ.md)), AV-Verträge mit Supabase & OpenAI
- [ ] Optional: Kontoverknüpfung (E-Mail/Apple/Google) anbieten, damit Profile geräteübergreifend erhalten bleiben
- [ ] `npm run test:rls` gegen das Produktionsprojekt (Staging) laufen lassen

## 14. Tests

```bash
npm test                 # Unit- & UI-Tests (Vitest + Testing Library)
npm run typecheck        # TypeScript
npm run build            # Produktionsbuild
npm run check:functions  # Deno-Typcheck der Edge Functions
npm run test:rls:local   # RLS-Tests gegen lokales Postgres (VINO_TEST_DATABASE_URL setzen)
npm run test:rls         # RLS-Tests gegen echtes Supabase (VINO_TEST_SUPABASE_URL/_ANON_KEY)
npm run e2e:demo         # Klickt die App im Demo-Modus durch, speichert Screenshots
```

Details zu den RLS-Tests: [`tests/integration/README.md`](tests/integration/README.md).

## Demo-Modus

`VITE_DEMO_MODE=true npm run dev` (oder Button auf der Einrichtungsseite). Zeigt alle Ansichten mit **frei erfundenen,
deutlich gekennzeichneten Beispielweinen** (`src/demo/fixtures.ts`). Es wird **nichts in Supabase gespeichert** und
**keine KI aufgerufen**; Erklärungen sind regelbasiert und als „Demo-Erklärung“ markiert. Der Zustand liegt nur im
`sessionStorage` des Tabs. Oben zeigt ein goldener Balken den Modus an (Antippen beendet ihn).

## Was ist getestet – und was nicht?

| Bereich | Status |
|---|---|
| Profilberechnung, Geschmackstyp, Matching, Lernfunktion, Validierung, Bildvorbereitung | ✅ automatisierte Tests (`npm test`) |
| Onboarding-UI (10 Fragen → Speicherung) | ✅ Testing-Library-Test |
| Migrationen + RLS + Storage-Policies | ✅ 18 Integrationstests gegen Postgres 16 mit Supabase-Nachbildung |
| Gesamter UI-Ablauf (Onboarding, Scan, Ergebnis, Speichern, Bewerten, Profil) | ✅ Browser-Durchlauf im Demo-Modus |
| Edge Functions | ✅ Deno-Typcheck · ⚠️ **nicht live ausgeführt** (kein Supabase-Projekt/OpenAI-Key in der Entwicklungsumgebung) |
| Echte KI-Erkennung von Etiketten/Weinkarten | ⚠️ **nicht getestet** – benötigt deinen OpenAI-Key |
| RLS gegen echtes Supabase (`rls.supabase.test.ts`) | ⚠️ vorbereitet, läuft sobald du URL + Key angibst |
