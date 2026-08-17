#!/usr/bin/env bash
# EMHIP server deploy: pull main, back up the DB, rebuild, restart.
#
# Runs on the server (as root) from /opt/emhip, normally via emhip-deploy.timer,
# which polls origin/main every minute — so pushing to GitHub deploys automatically.
# Run manually with --force to redeploy the current commit.
#
# Data safety: the SQL Server data lives in the `sqlserver-data` named volume,
# which `up -d --build` never touches; schema changes are applied as EF Core
# migrations on API startup, and a full DB backup is taken before every deploy.
# Never run `docker compose down -v` on this host — that deletes the volume.
set -euo pipefail

REPO_DIR=/opt/emhip
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

# One deploy at a time; the timer just skips a beat if one is still running.
exec 9>/var/lock/emhip-deploy.lock
flock -n 9 || { echo "another deploy is running; skipping"; exit 0; }

cd "$REPO_DIR"
git fetch origin main --quiet
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ] && [ "${1:-}" != "--force" ]; then
    exit 0
fi

echo "[deploy] $(date -Is) deploying ${REMOTE:0:12} (was ${LOCAL:0:12})"

# Full DB backup before anything changes. Tolerated on first boot when the DB
# doesn't exist yet; any other failure aborts the deploy.
if ! ./deploy/backup.sh pre-deploy; then
    if docker compose ps --status running sqlserver 2>/dev/null | grep -q sqlserver; then
        echo "[deploy] ABORT: sqlserver is running but backup failed" >&2
        exit 1
    fi
    echo "[deploy] WARN: no running database to back up (first deploy?) — continuing"
fi

# The server checkout is a deploy target, not a workspace — take origin/main as-is.
git reset --hard origin/main --quiet

# Keep systemd units in sync with the repo.
cp deploy/systemd/*.service deploy/systemd/*.timer /etc/systemd/system/
systemctl daemon-reload

# Build first, then swap — keeps downtime to the container restart, not the build.
$COMPOSE build
$COMPOSE up -d --remove-orphans

# Reclaim space from superseded image layers.
docker image prune -f >/dev/null

echo "[deploy] $(date -Is) done: $($COMPOSE ps --format '{{.Service}}={{.State}}' | tr '\n' ' ')"
