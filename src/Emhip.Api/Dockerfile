# Build context must be the repository root (docker-compose.yml does this), since this project
# references sibling projects under ../Emhip.Application etc.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Emhip.slnx ./
COPY src/Emhip.Api/Emhip.Api.csproj src/Emhip.Api/
COPY src/Emhip.Application/Emhip.Application.csproj src/Emhip.Application/
COPY src/Emhip.Domain/Emhip.Domain.csproj src/Emhip.Domain/
COPY src/Emhip.Infrastructure/Emhip.Infrastructure.csproj src/Emhip.Infrastructure/
RUN dotnet restore src/Emhip.Api/Emhip.Api.csproj

COPY src/ src/
RUN dotnet publish src/Emhip.Api/Emhip.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Emhip.Api.dll"]
