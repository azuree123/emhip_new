# Live preview (Claude Code web session)

This folder brings EMHIP up as a **running, clickable preview** inside a Claude Code on the web
session, where the normal `docker compose up --build` path can't complete because of the
sandbox's egress policy. It is a preview harness, not a production deployment — for real
deployment see the root `README.md` and `docker-compose.yml`.

## Why the plain Compose path doesn't work here

| Piece | Normal path | In this sandbox | What we do instead |
|---|---|---|---|
| SQL Server | `mcr.microsoft.com/mssql/server` | ✅ pulls | run via `docker compose up -d sqlserver` |
| API / Workers | build on `mcr…/dotnet/sdk` | ✅ image pulls, ❌ `dotnet restore` fails to trust the egress proxy's TLS CA | run **from source** in the SDK image with the proxy CA installed + `--network host` |
| Client image | build on `node:*` + `nginx:*` (Docker Hub) | ❌ Docker Hub blob CDN returns **403** through the proxy | build the Angular app **on the host** and serve the static output with `preview-server.js` |

Two more sandbox specifics the scripts handle:

- The egress proxy listens only on the host's `127.0.0.1`, so the API container uses
  `--network host` (rather than `host.docker.internal`, which is refused) to reach both the
  proxy (for `dotnet restore`) and SQL Server on `localhost:1433`.
- The Angular CLI needs Node ≥ 22.22.3; if the host Node is older, fetch a matching Node from
  `nodejs.org` and put it on `PATH` before building.

## Bring it up

```bash
# 0. one-time: real secrets
cp .env.example .env    # then edit; the scripts read MSSQL_SA_PASSWORD, JWT_KEY, etc.

# 1. backend: SQL Server (compose) + API from source (SDK image, host network, port 5299)
bash preview/run-backend.sh
docker logs -f emhip-api          # ready at: Now listening on: http://0.0.0.0:5299

# 2. build the Angular app on the host (production config -> relative /api, /hubs)
cd client && npm ci && npx ng build --configuration production && cd ..

# 3. serve it single-origin on :8080, proxying /api and /hubs to the API
PORT=8080 node preview/preview-server.js
```

Then open the session's **port 8080** preview URL. Sign in with the `Bootstrap__Admin*`
credentials from your `.env`.

`preview-server.js` mirrors `client/nginx.conf` (static + SPA fallback, `/api` → API with the
prefix stripped, `/hubs` → API with WebSocket upgrade) and — unlike `ng serve` — does not apply
a Host-header allowlist, so it works behind an arbitrary preview hostname.

## Notes

- **Empty state is expected on a fresh DB.** To populate data, run the seeder (also an
  `mcr…/dotnet/sdk` container, same pattern as `run-backend.sh`):
  `dotnet run --project tools/Emhip.Seeder -- --connection "<conn>" --guests 500 --hubs 1`.
- **Live "Urgent Cases" (SignalR) needs the background workers** running as well; start them the
  same way the API is started but with `src/Emhip.Workers/Emhip.Workers.csproj` and
  `Api__BaseUrl=http://127.0.0.1:5299/`.
- The `client/proxy.conf.json` in the repo is an alternative for `ng serve` (dev server) against
  a running API, if you prefer live reload over a production build.
