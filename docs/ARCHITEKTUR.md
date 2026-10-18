# Architektur

```
Browser (React SPA)                         Supabase Cloud
┌──────────────────────────┐   anon JWT    ┌──────────────────────────────┐
│ pages/ components/       │──────────────▶│ Postgres + RLS (auth.uid())  │
│   ↓ hooks/queries.ts     │               │ Storage: wine-scans (privat) │
│   ↓ services/ (Interface)│──────────────▶│ Edge Functions ──▶ OpenAI    │
│ lib/ (reine Logik)       │               │   (Secrets: OPENAI_API_KEY)  │
└──────────────────────────┘               └──────────────────────────────┘
```

## Schichten

| Schicht | Ordner | Regel |
|---|---|---|
| UI | `src/pages`, `src/components/{ui,layout,onboarding,scanner,wine,profile,brand}` | kennt nur Hooks, nie Supabase direkt |
| Datenzugriff (Hooks) | `src/hooks/queries.ts`, `use-scan-workflow.ts` | TanStack Query, Cache-Invalidierung |
| Business-Logik | `src/services/taste-service.ts` | Onboarding abschließen, Profil neu lernen |
| Repository / KI-Service | `src/services/repository.ts`, `ai-service.ts` | Interfaces; Implementierungen `supabase-*` und `demo` |
| Reine Logik | `src/lib/taste-profile`, `src/lib/matching`, `src/lib/image`, `src/lib/validation` | ohne Seiteneffekte, voll getestet |
| Geteilt Frontend ⇄ Server | `supabase/functions/_shared` | Typen, Matching, Zod-Schemas, Prompts – **keine** Laufzeit-APIs |
| Nur Server | `supabase/functions/_server` | Deno: Auth, OpenAI-Client, Rate-Limits, CORS |

Der Matching-Algorithmus existiert genau einmal (`_shared/matching.ts`) und läuft identisch im Browser
(Live-Score zum aktuellen Profil) und in den Edge Functions (gespeicherter Score, Input für Erklärungen).

## Datenfluss eines Scans

1. Browser bereitet Foto vor (`lib/image/prepare.ts`): Typ/Größe prüfen, Ausrichtung anwenden, ≤ 2048 px, JPEG-Neukodierung → **EXIF/GPS entfernt**.
2. `scans`-Zeile anlegen → Upload nach `wine-scans/<uid>/<scan_id>/<n>.jpg` (RLS: nur eigener Ordner).
3. `analyze-wine-image` verifiziert JWT, prüft Eigentum & Pfade, Tageslimit, Magic Bytes, ruft OpenAI mit Strict-JSON-Schema, validiert mit Zod, berechnet Matches, speichert `scan_items`.
4. Sicher identifizierte Weine (≥ 0,85, Name + Produzent lesbar) werden im gemeinsamen Katalog `wines` verknüpft – nur per service_role, nie überschrieben. Unsichere bleiben nutzerbezogen in `scan_items.extracted_data`.
5. Detailansicht ruft `generate-wine-explanation` (gecacht pro Profilversion & Score).

## Unsicherheit

Jede Weinangabe hat eine Herkunft: `visible` (lesbar), `inferred` (abgeleitet), Geschmack `knowledge` / `style_estimate` / `unknown`.
Matching ignoriert unbekannte Merkmale, gewichtet Schätzungen schwächer und liefert `confidence`
(`high`/`medium`/`low`/`insufficient`). Bei `insufficient` zeigt die UI „Einschätzung noch unsicher“ statt einer Zahl.

## Lernen

`rebuildLearnedProfile(initial, ratings)` berechnet das gelernte Profil immer komplett neu – reihenfolgeunabhängig,
max. 8 Punkte pro Bewertung und Merkmal, max. 25 Punkte Gesamtabweichung. `initial_profile` bleibt unverändert gespeichert.

## Vorbereitet für später
- Kontoverknüpfung: anonyme Nutzer → `updateUser`/`linkIdentity` (gleiche `user_id`)
- Kostenkontrolle: `ai_usage` + Tageslimits; weitere Limits (z. B. global) dort ergänzbar
- Missbrauchsschutz: Auth-Rate-Limits, CAPTCHA, CORS-Allowlist
- Datenlöschung: `delete-my-data`
