#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL to the TARGET database}"
if [[ $# -ne 1 || ! -f "$1" ]]; then
  echo "Usage: DATABASE_URL=... $0 path/to/backup.dump" >&2
  exit 2
fi
echo "WARNING: this restore can overwrite objects in the TARGET database."
echo "Target: database configured in DATABASE_URL (credentials hidden)"
read -r -p "Type RESTORE to continue: " CONFIRM
[[ "$CONFIRM" == "RESTORE" ]] || { echo "Cancelled."; exit 1; }
pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error --single-transaction \
  --dbname="$DATABASE_URL" "$1"
echo "Restore completed."
