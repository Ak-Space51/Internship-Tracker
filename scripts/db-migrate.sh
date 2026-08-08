#!/usr/bin/env bash
# Applies any unapplied SQL files in database/migrations (ordered by filename)
# using psql inside the docker compose db container. Tracks applied migrations
# in a schema_migrations table.
set -euo pipefail

cd "$(dirname "$0")/.."

PSQL=(docker compose exec -T db psql -v ON_ERROR_STOP=1 -q -U intern -d internships)

"${PSQL[@]}" -c "CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);"

for file in database/migrations/*.sql; do
    name="$(basename "$file")"
    applied="$("${PSQL[@]}" -tAc "SELECT 1 FROM schema_migrations WHERE filename = '$name'")"
    if [[ "$applied" == "1" ]]; then
        echo "skip   $name"
        continue
    fi
    echo "apply  $name"
    "${PSQL[@]}" < "$file"
    "${PSQL[@]}" -c "INSERT INTO schema_migrations (filename) VALUES ('$name')"
done

echo "migrations up to date"
