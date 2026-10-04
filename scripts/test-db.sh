#!/usr/bin/env bash
# Applies the Supabase migrations to a scratch Postgres database and runs the SQL privacy tests.
# Needs psql and a server you can create databases on (PGHOST, PGUSER, etc. as usual).
set -euo pipefail
cd "$(dirname "$0")/.."
db="snab_test_$$"
createdb "$db"
trap 'dropdb --if-exists "$db"' EXIT
run() { psql --quiet --no-psqlrc --output=/dev/null -v ON_ERROR_STOP=1 -d "$db" -f "$1"; }
run supabase/tests/supabase-stub.sql
for migration in supabase/migrations/*.sql; do run "$migration"; done
for test in supabase/tests/*.sql; do [[ "$test" == */supabase-stub.sql ]] || run "$test"; done
