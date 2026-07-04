#!/usr/bin/env bash
# Forward-only migration runner. Applies any *.sql file under
# supabase/migrations/ that hasn't been recorded in public.schema_migrations,
# each inside its own transaction. Files are applied in lexicographic order,
# so prefix them with a sortable timestamp: 20260704T1830_add_foo.sql.
#
# Never resets the schema. Never edits an existing migration. To roll back,
# write a new forward migration that undoes the change.
#
# Usage:
#   bash scripts/migrate-environment.sh <DATABASE_URL> <env-label>
#
# Examples:
#   bash scripts/migrate-environment.sh "$DEV1_DB_URL" dev1
#   bash scripts/migrate-environment.sh "$DEV2_DB_URL" dev2
#   FORCE=1 bash scripts/migrate-environment.sh "$PROD_DB_URL" prod
#
# Environment flags:
#   FORCE=1        — required for env-label "prod"
#   MARK_ONLY=1    — record every migration file as applied WITHOUT running
#                    its SQL. Use once, on an already-baselined DB, to
#                    bootstrap the schema_migrations table.

set -euo pipefail

DB_URL="${1:?Usage: $0 <DATABASE_URL> <env-label>}"
ENV_LABEL="${2:?Usage: $0 <DATABASE_URL> <env-label>}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/../supabase/migrations"

if [[ "$ENV_LABEL" == "prod" && "${FORCE:-0}" != "1" ]]; then
  echo "ERROR: Migrating prod requires FORCE=1."
  echo "Run: FORCE=1 bash scripts/migrate-environment.sh \"\$PROD_DB_URL\" prod"
  exit 1
fi

echo "=== Migrating $ENV_LABEL ==="

echo "1. Ensuring public.schema_migrations exists..."
psql "$DB_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version     text        PRIMARY KEY,
  applied_at  timestamptz NOT NULL DEFAULT now()
);
SQL

echo "2. Reading applied versions..."
APPLIED="$(psql "$DB_URL" -At -c "SELECT version FROM public.schema_migrations ORDER BY version;")"

PENDING=()
while IFS= read -r -d '' f; do
  version="$(basename "$f")"
  if ! grep -Fxq "$version" <<<"$APPLIED"; then
    PENDING+=("$f")
  fi
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' -print0 | sort -z)

if [[ ${#PENDING[@]} -eq 0 ]]; then
  echo "   Nothing to apply. $ENV_LABEL is up to date."
  echo "=== $ENV_LABEL migrated successfully ==="
  exit 0
fi

if [[ "${MARK_ONLY:-0}" == "1" ]]; then
  echo "3. MARK_ONLY=1 — recording without executing:"
  for f in "${PENDING[@]}"; do
    version="$(basename "$f")"
    echo "   + $version"
    psql "$DB_URL" -v ON_ERROR_STOP=1 -q \
      -c "INSERT INTO public.schema_migrations(version) VALUES ('$version');"
  done
  echo "=== $ENV_LABEL marked (no SQL executed) ==="
  exit 0
fi

echo "3. Applying ${#PENDING[@]} pending migration(s):"
for f in "${PENDING[@]}"; do
  version="$(basename "$f")"
  echo "   -> $version"
  psql "$DB_URL" -v ON_ERROR_STOP=1 --single-transaction \
    -f "$f" \
    -c "INSERT INTO public.schema_migrations(version) VALUES ('$version');"
done

echo "=== $ENV_LABEL migrated successfully ==="
