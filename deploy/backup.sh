#!/usr/bin/env bash
# Full backup of the Emhip database to /opt/emhip-backups on the host
# (bind-mounted into the sqlserver container at /var/opt/mssql/backup).
#
# Usage: backup.sh [tag]   — tag defaults to "scheduled"; deploy.sh passes "pre-deploy".
# Retention: 14 days. Restore with:
#   docker compose exec sqlserver /opt/mssql-tools18/bin/sqlcmd -C -U sa -P "$MSSQL_SA_PASSWORD" \
#     -Q "RESTORE DATABASE [Emhip] FROM DISK='/var/opt/mssql/backup/<file>.bak' WITH REPLACE"
# (gunzip the file first if it has been compressed.)
set -euo pipefail

REPO_DIR=/opt/emhip
BACKUP_DIR=/opt/emhip-backups
TAG="${1:-scheduled}"
STAMP=$(date +%Y%m%d-%H%M%S)
FILE="emhip-${TAG}-${STAMP}.bak"

cd "$REPO_DIR"
set -a; source .env; set +a

# SQL Server runs as UID 10001 (mssql) inside the container and must be able to
# write into the bind-mounted backup dir.
install -d -o 10001 -g 0 -m 770 "$BACKUP_DIR"

# COMPRESSION is unavailable on Express edition, so back up plain and gzip on the host.
docker compose exec -T sqlserver /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa \
    -P "$MSSQL_SA_PASSWORD" -b \
    -Q "BACKUP DATABASE [Emhip] TO DISK='/var/opt/mssql/backup/${FILE}' WITH INIT, CHECKSUM"

gzip -f "${BACKUP_DIR}/${FILE}"
echo "[backup] wrote ${BACKUP_DIR}/${FILE}.gz"

# Uploaded documents when the storage provider is "Local" — the database only holds their
# metadata, so the files need their own copy. Skipped when the directory is empty (i.e. a cloud
# provider is configured in Settings, where the provider keeps its own durability guarantees).
DOCS_DIR=/opt/emhip-documents
if [ -d "$DOCS_DIR" ] && [ -n "$(ls -A "$DOCS_DIR" 2>/dev/null)" ]; then
    DOCS_FILE="emhip-documents-${TAG}-${STAMP}.tar.gz"
    tar -czf "${BACKUP_DIR}/${DOCS_FILE}" -C "$DOCS_DIR" .
    echo "[backup] wrote ${BACKUP_DIR}/${DOCS_FILE}"
fi

find "$BACKUP_DIR" -name 'emhip-*.bak.gz' -mtime +14 -delete
find "$BACKUP_DIR" -name 'emhip-documents-*.tar.gz' -mtime +14 -delete
