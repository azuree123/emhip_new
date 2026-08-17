# EMHIP production deployment

Production runs on `81.0.221.206` (Ubuntu 24.04) at `/opt/emhip`, using
`docker-compose.yml` + `docker-compose.prod.yml`. Only port 80 (the Angular
client's nginx, which proxies `/api/` and `/hubs/` to the API) is public; SQL
Server and the API are bound to loopback.

## Pipeline: push to deploy

`emhip-deploy.timer` runs [deploy.sh](deploy.sh) every minute. It fetches
`origin/main`; when a new commit appears it:

1. takes a full DB backup (aborts the deploy if the backup fails while the DB is up),
2. `git reset --hard origin/main`,
3. re-installs these systemd units if they changed,
4. `docker compose build` (app stays up during the build), then `up -d`,
5. prunes superseded image layers.

So **pushing to `main` on GitHub deploys within ~1 minute**. Nothing on the
server is edited by hand; the checkout is a pure deploy target.

Manual deploy / redeploy of the current commit:

```bash
ssh root@81.0.221.206 '/opt/emhip/deploy/deploy.sh --force'
```

Logs: `journalctl -u emhip-deploy.service -n 100`.

## Data safety

- The database lives in the `sqlserver-data` Docker volume — rebuilds and
  redeploys never touch it. Schema changes are EF Core migrations applied on
  API startup. **Never run `docker compose down -v` on the server.**
- Backups go to `/opt/emhip-backups` (gzipped `.bak`): before every deploy, and
  nightly at 03:00 via `emhip-backup.timer`. Retention is 14 days.
- Restore: see the header comment in [backup.sh](backup.sh).

## Secrets

Real secrets live only in `/opt/emhip/.env` on the server (mode 600, never in
git). See `.env.example` for the variable list, including the production-only
`PUBLIC_ORIGIN` and `MSSQL_PID`.

## Host tuning (one-time, already applied)

Docker with log rotation + `live-restore`; UFW (22 rate-limited/80/443) +
fail2ban; 4G swap with `vm.swappiness=10`; BBR congestion control and larger
accept queues; unattended security upgrades; SQL Server capped at 4GB RAM via
`MSSQL_MEMORY_LIMIT_MB` in the prod override.

_Deployed to production 2026-08-17._
