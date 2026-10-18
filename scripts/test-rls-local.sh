#!/usr/bin/env bash
# Spielt Supabase-Stub + Migrationen in eine frische Testdatenbank ein und führt die RLS-Tests aus.
set -euo pipefail
cd "$(dirname "$0")/.."

BASE_URL="${VINO_TEST_DATABASE_URL:-postgres://postgres@127.0.0.1:5432/postgres}"
DB_NAME="vino_rls_test"
ADMIN_URL="$BASE_URL"
TEST_URL="${BASE_URL%/*}/$DB_NAME"

psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -q -c "drop database if exists $DB_NAME" -c "create database $DB_NAME"
psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -f tests/integration/supabase-stub.sql
for f in supabase/migrations/*.sql; do
  echo "→ $f"
  psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done

VINO_TEST_DATABASE_URL="$TEST_URL" npx vitest run --config vitest.rls.config.ts tests/integration/rls.postgres.test.ts
