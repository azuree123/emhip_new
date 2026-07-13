# Build context must be the repository root (docker-compose.yml does this), since this project
# references sibling projects under ../Emhip.Application etc.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Emhip.slnx ./
COPY src/Emhip.Workers/Emhip.Workers.csproj src/Emhip.Workers/
COPY src/Emhip.Application/Emhip.Application.csproj src/Emhip.Application/
COPY src/Emhip.Domain/Emhip.Domain.csproj src/Emhip.Domain/
COPY src/Emhip.Infrastructure/Emhip.Infrastructure.csproj src/Emhip.Infrastructure/
RUN dotnet restore src/Emhip.Workers/Emhip.Workers.csproj

COPY src/ src/
RUN dotnet publish src/Emhip.Workers/Emhip.Workers.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/runtime:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Emhip.Workers.dll"]
