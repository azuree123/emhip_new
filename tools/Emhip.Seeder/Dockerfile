# Build context must be the repository root (docker-compose.yml does this).
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Emhip.slnx ./
COPY tools/Emhip.Seeder/Emhip.Seeder.csproj tools/Emhip.Seeder/
COPY src/Emhip.Domain/Emhip.Domain.csproj src/Emhip.Domain/
COPY src/Emhip.Infrastructure/Emhip.Infrastructure.csproj src/Emhip.Infrastructure/
COPY src/Emhip.Application/Emhip.Application.csproj src/Emhip.Application/
RUN dotnet restore tools/Emhip.Seeder/Emhip.Seeder.csproj

COPY src/ src/
COPY tools/ tools/
RUN dotnet publish tools/Emhip.Seeder/Emhip.Seeder.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/runtime:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
# No --connection baked in — the seeder falls back to the EMHIP_CONNECTION env var (set in
# docker-compose.yml). Pass extra args (e.g. --guests 100000 --hubs 3) via `docker compose run`.
ENTRYPOINT ["dotnet", "Emhip.Seeder.dll"]
