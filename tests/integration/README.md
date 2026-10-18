# Integrationstests (RLS & Sicherheit)

Es gibt zwei Varianten:

## 1. Lokal gegen Postgres (ohne Supabase-Konto)

`rls.postgres.test.ts` führt alle Migrationen auf einem leeren Postgres aus, das
die relevanten Teile von Supabase nachbildet (`supabase-stub.sql`: Rollen
`anon`/`authenticated`/`service_role`, `auth.uid()`, `storage.objects`).

```bash
# Voraussetzung: lokaler Postgres ≥ 15 (z. B. via Homebrew / apt / Docker)
VINO_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5432/postgres ./scripts/test-rls-local.sh
```

Das Skript legt eine frische Datenbank `vino_rls_test` an, spielt Stub + Migrationen
ein und startet die Tests.

## 2. Gegen ein echtes Supabase-Projekt

`rls.supabase.test.ts` meldet zwei anonyme Nutzer an und prüft echte API-Zugriffe
(PostgREST + Storage). **Nur gegen ein Entwicklungsprojekt** ausführen:

```bash
VINO_TEST_SUPABASE_URL=https://xyz.supabase.co \
VINO_TEST_SUPABASE_ANON_KEY=ey... \
npm run test:rls
```
