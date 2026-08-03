#!/usr/bin/env bash
# Bring up the EMHIP backend for a live preview inside a Claude Code web session.
#
# Why not just `docker compose up`? In this sandbox:
#   * Docker Hub blobs (node:*, nginx:* for the client image) return 403 through the egress
#     proxy, so the client image can't build — we build the Angular app on the host instead
#     (see preview/README.md) and serve it with preview/preview-server.js.
#   * `mcr.microsoft.com` images (SQL Server, .NET SDK) DO pull, so SQL Server runs via compose
#     and the API runs from source inside the .NET SDK image.
#   * `dotnet restore` inside a container must trust the proxy CA, and the proxy only listens on
#     the host's 127.0.0.1 — so we use --network host and install the CA into the container.
#
# Requires: docker, a populated .env (copy from .env.example), and the proxy CA bundle.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

CCR_CA="${CCR_CA:-/root/.ccr/ca-bundle.crt}"
HTTPS_PROXY_URL="${HTTPS_PROXY:-http://127.0.0.1:41541}"
set -a; . ./.env; set +a

echo ">> Starting SQL Server (compose)…"
docker compose up -d sqlserver
echo ">> Waiting for SQL Server health…"
until [ "$(docker inspect -f '{{.State.Health.Status}}' emhip-sqlserver-1 2>/dev/null)" = "healthy" ]; do sleep 3; done
echo "   healthy."

echo ">> Starting API from source in the .NET SDK image (host network, port 5299)…"
docker rm -f emhip-api >/dev/null 2>&1 || true
docker run -d --name emhip-api \
  --network host \
  -v "$REPO":/src \
  -v "$CCR_CA":/usr/local/share/ca-certificates/ccr-proxy.crt:ro \
  -w /src \
  -e HTTPS_PROXY="$HTTPS_PROXY_URL" \
  -e NO_PROXY=localhost,127.0.0.1 \
  -e DOTNET_NOLOGO=1 -e DOTNET_CLI_TELEMETRY_OPTOUT=1 \
  -e ASPNETCORE_ENVIRONMENT=Docker \
  -e ASPNETCORE_URLS=http://+:5299 \
  -e ApplyMigrationsOnStartup=true \
  -e ConnectionStrings__Emhip="Server=127.0.0.1,1433;Database=Emhip;User Id=sa;Password=${MSSQL_SA_PASSWORD};TrustServerCertificate=True;" \
  -e Cors__AllowedOrigins__0=http://localhost:8080 \
  -e Frontend__BaseUrl=http://localhost:8080 \
  -e Jwt__Key="${JWT_KEY}" -e Jwt__Issuer=Emhip.Api -e Jwt__Audience=Emhip.Client \
  -e Internal__SharedSecret="${INTERNAL_SHARED_SECRET}" \
  -e Bootstrap__AdminEmail="${BOOTSTRAP_ADMIN_EMAIL}" \
  -e Bootstrap__AdminPassword="${BOOTSTRAP_ADMIN_PASSWORD}" \
  mcr.microsoft.com/dotnet/sdk:10.0 \
  bash -c "update-ca-certificates >/dev/null 2>&1 && exec dotnet run --project src/Emhip.Api/Emhip.Api.csproj -c Release --no-launch-profile"

echo ">> API container started. Follow logs with:  docker logs -f emhip-api"
echo "   (first run restores NuGet + builds; it is ready when you see 'Now listening on: http://0.0.0.0:5299')"
