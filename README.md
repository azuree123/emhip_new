# EMHIP — Mental Health Hub Case Management

EMHIP is a case-management application for community mental-health hubs. Staff (CMHWs —
Community Mental Health Workers — and Hub Managers) register and track "guests", run casework
sessions, record follow-up contacts, flag urgent/safeguarding cases, and produce service-level
reports.

This repository is an implementation of the design handoff in `project/` (see
`project/design_handoff_emhip/README.md` and `ARCHITECTURE.md` for the original design brief),
built as:

- **Backend**: ASP.NET Core Web API on .NET 10, CQRS (EF Core for writes, Dapper for
  high-volume reads), SQL Server, keyset pagination, transactional outbox, SignalR, background
  workers — see `project/design_handoff_emhip/ARCHITECTURE.md` for the architecture this
  follows.
- **Frontend**: Angular 22 (standalone components, signals), pixel-matched to the Figma export
  in `project/screens/Components.bundle.js`.

## Solution layout

```
Emhip.slnx
├── src/
│   ├── Emhip.Api/             ASP.NET Core Web API — controllers, SignalR hub, ASP.NET Core Identity + JWT auth, Program.cs, Dockerfile
│   ├── Emhip.Application/     CQRS commands/queries (MediatR), DTOs, FluentValidation
│   ├── Emhip.Domain/          Entities, enums, domain events
│   ├── Emhip.Infrastructure/  EF Core DbContext + migrations, Dapper read services, outbox/audit interceptors
│   └── Emhip.Workers/         BackgroundService host — outbox relay, escalation, report materializer, follow-up scheduler, Dockerfile
├── tools/
│   └── Emhip.Seeder/          Console app — SqlBulkCopy-based large synthetic dataset generator, Dockerfile
├── tests/
│   ├── Emhip.UnitTests/       Domain + Application unit tests
│   └── Emhip.IntegrationTests/  WebApplicationFactory-based API tests
├── client/                    Angular 22 frontend — Dockerfile + nginx.conf for the production image
├── docker-compose.yml         SQL Server + API + Workers + client, wired together
└── .env.example                Copy to .env before running docker compose
```

## Quick start with Docker Compose (recommended)

Requires Docker + the Compose plugin (`docker compose version`). This brings up SQL Server, the
API, the background workers, and the Angular app together, with migrations applied
automatically on first boot.

```bash
cp .env.example .env        # then edit MSSQL_SA_PASSWORD to a real password
docker compose up --build
```

- App: http://localhost:8080
- API directly (Swagger, for debugging): http://localhost:5299/swagger
- SQL Server: `localhost:1433` (user `sa`, password from `.env`)

Seed a large synthetic dataset once the stack is healthy (optional, demonstrates the
`SqlBulkCopy`-based large-dataset seeder — see `tools/Emhip.Seeder`):

```bash
docker compose --profile seed run --rm seeder --guests 100000 --hubs 3
```

Stop everything (add `-v` to also drop the SQL Server data volume):

```bash
docker compose down
```

### How the pieces talk to each other in Docker

- `client` is nginx serving the built Angular app and reverse-proxying `/api/*` → `api:8080` and
  `/hubs/*` → `api:8080` (WebSocket-upgraded, for SignalR) — see `client/nginx.conf`. This means
  the browser only ever talks to one origin, so there's no CORS to configure for this path.
- `api` applies EF Core migrations on startup in this mode (`ApplyMigrationsOnStartup=true`,
  set only in `docker-compose.yml`) so there's no separate migration step — **this convenience
  is for the Compose demo path only**; see "Production considerations" below before using it
  for a real rollout.
- `workers` talks to `sqlserver` directly and to `api`'s internal notification endpoint over the
  Compose network (`http://api:8080/`) to relay live urgent-case escalations over SignalR.

### Rebuilding after code changes

```bash
docker compose up --build          # rebuild whatever changed
docker compose up --build api      # just one service
```

## Manual deployment (without Docker)

Requires the .NET 10 SDK, Node.js ≥ 22.22.3, and a SQL Server instance (SQL Server on
Windows/Linux, Azure SQL, or SQL Server on a VM all work — Docker for *just* the database is
also fine even if you're running the app itself without containers).

### 1. Database

```bash
dotnet tool install --global dotnet-ef   # once
dotnet ef database update --project src/Emhip.Infrastructure --startup-project src/Emhip.Infrastructure
```

Set the real connection string via the `ConnectionStrings__Emhip` environment variable (don't
edit `appsettings.json` in place on a shared server — see "Production considerations"). Locally,
`src/Emhip.Api/appsettings.Development.json` / `src/Emhip.Workers/appsettings.json` already point
at `Server=(local);Database=Emhip;Trusted_Connection=True;TrustServerCertificate=True;`.

### 2. API

```bash
dotnet publish src/Emhip.Api -c Release -o /path/to/publish/api
cd /path/to/publish/api
ASPNETCORE_URLS=http://0.0.0.0:5000 \
ConnectionStrings__Emhip="<your connection string>" \
Cors__AllowedOrigins__0="https://your-app-domain" \
dotnet Emhip.Api.dll
```

Run it behind a real reverse proxy (nginx, IIS, Azure App Service, etc.) that terminates TLS —
the app itself expects to sit behind one (see `UseHttpsRedirection` guarded off for the `Docker`
environment in `Program.cs`; for a bare-metal/VM deployment either terminate TLS in front of it
or set `ASPNETCORE_ENVIRONMENT` so that guard doesn't apply to you).

### 3. Background workers

```bash
dotnet publish src/Emhip.Workers -c Release -o /path/to/publish/workers
cd /path/to/publish/workers
ConnectionStrings__Emhip="<your connection string>" \
Api__BaseUrl="https://your-api-domain/" \
dotnet Emhip.Workers.dll
```

Run this as a long-lived service (systemd unit, Windows Service, container, etc.) — it's a
`BackgroundService` host, not a web server, so there's nothing to reverse-proxy.

### 4. Frontend

```bash
cd client
npm ci
npx ng build   # production build by default; outputs to client/dist/client/browser
```

Before building, point `src/environments/environment.prod.ts` at wherever you're hosting the API
(either a relative path behind your own reverse-proxy setup, mirroring `client/nginx.conf`'s
`/api` and `/hubs` proxying, or an absolute URL if the API is on a different origin — in which
case also set real CORS origins on the API via `Cors__AllowedOrigins__0`). Serve the contents of
`client/dist/client/browser` as static files from any web server (nginx, Apache, a CDN/static
host) with SPA fallback to `index.html` for unmatched paths — `client/nginx.conf` is a working
reference for that if you're using nginx.

### 5. Seed data / tests

```bash
dotnet run --project tools/Emhip.Seeder -- --connection "<your connection string>" --guests 100000 --hubs 3
dotnet test
```

### Authentication, roles & permissions

Sign-in is real: ASP.NET Core Identity (`ApplicationUser`/`ApplicationRole`, local accounts —
no Entra ID/OIDC) backs `POST /auth/login`, which issues a JWT bearer token. There's no
self-registration by design — clinical-data access is admin-provisioned. On first boot (when
`ApplyMigrationsOnStartup=true`, e.g. under Docker Compose), `IdentitySeeder` creates the three
built-in roles (`Cmhw`, `HubManager`, `Admin`) and bootstraps a first Admin account from the
`Bootstrap:AdminEmail` / `Bootstrap:AdminPassword` config (see `.env.example`) — sign in with
that account and use the **Hub Workers** / **Roles & Permissions** screens (under the sidebar's
Admin section) to create real staff accounts and roles from there.

Authorization is claims-based and granular: every permission in `Emhip.Domain.Authorization.
Permissions` (e.g. `guests.clinical.edit`, `admin.manageusers`) is registered as its own ASP.NET
Core authorization policy and enforced with `[Authorize(Policy = Permissions.X.Y)]` on
controller actions. Permissions are stored as claims on `ApplicationRole` and flattened onto
the user's JWT at login, so the same role name can be re-scoped by an admin (via the role
editor) without a deploy. The Angular app mirrors this: `AuthService.hasPermission(...)` drives
route guards (`permissionGuard`) and sidebar nav visibility, so a user without
`admin.manageusers`/`admin.manageroles` never sees the Admin section at all — but the real
enforcement is server-side, not just hidden UI.

Forgot/reset password (`POST /auth/forgot-password` / `/auth/reset-password`) uses ASP.NET
Core Identity's token-based reset flow; `IEmailSender`'s default implementation
(`LoggingEmailSender`) just logs the reset link instead of sending real email — **replace it
with a real provider (SendGrid, SES, etc.) before relying on the forgot-password flow in
production.**

## Production considerations

Whichever deployment path you use, before treating this as production-ready:

- **Real email**: replace `LoggingEmailSender` (see "Authentication, roles & permissions" above)
  with a real provider before relying on the forgot-password flow.
- **JWT signing key / bootstrap admin password / internal shared secret**: `Jwt__Key`,
  `Bootstrap__AdminPassword`, and `Internal__SharedSecret` all have placeholder values in
  `appsettings.json` — set real random values via `.env` (Docker Compose) or your secrets
  manager, never the checked-in placeholders.
- **Migrations as an explicit step**: `ApplyMigrationsOnStartup` (Docker Compose only) is a demo
  convenience. For a real environment, run `dotnet ef database update` (or
  `dotnet ef migrations bundle` — see `ARCHITECTURE.md`) as a controlled deploy step instead of
  auto-applying on every container start.
- **Secrets**: don't commit real connection strings/passwords. Use environment variables, a
  secrets manager, or `dotnet user-secrets` locally — the connection strings checked into
  `appsettings.json` are placeholders pointing at `(local)`/Trusted_Connection.
- **TLS**: terminate HTTPS in front of the API and client (a real reverse proxy/load balancer,
  not the containers themselves) and turn `UseHttpsRedirection` back on for whatever environment
  name you use in that setup.
- **The escalation worker → API notification path**: `Emhip.Workers` calls `Emhip.Api`'s
  `POST /internal/urgent-cases/notify` over plain HTTP, authenticated with a shared secret
  (`Internal__SharedSecret`, checked against the `X-Internal-Secret` header in
  `InternalNotificationsController`) because only the API process holds the live SignalR
  connections. Still put this behind the internal network boundary (it's a shared secret, not
  full service-to-service auth), or replace it with Azure SignalR Service before exposing either
  service publicly.
- **Scale-up steps already called out in `project/design_handoff_emhip/ARCHITECTURE.md`**: SQL
  table partitioning by month for `Contacts`/`AuditEvents`, columnstore indexes for the reporting
  tables, and moving the in-process outbox `Channel<T>` to Azure Service Bus/RabbitMQ once hubs
  scale out — apply these once real data volumes are known.

## Screens

| Route | Screen |
|---|---|
| `/login`, `/forgot-password`, `/reset-password` | Sign-in and password recovery (public, outside the shell) |
| `/dashboard` | Dashboard (CMHW) or Service Overview (Hub Manager) — driven by the `dashboard.hubmanager.view` permission |
| `/guests` | Guest Data Sheet — keyset-paginated, virtual-scrolled guest list |
| `/guests/new` | Register New Guest (Demographics → Initial Conversation wizard) |
| `/guests/:guestId` | Guest Workspace (Overview / Demographics / Clinical / Pathway / Follow-up / Notes tabs) |
| `/followups` | Global Follow-up queue |
| `/urgent-cases` | Urgent Cases — live via SignalR |
| `/reports` | Pathway reporting + CSV export |
| `/hub-workers` | Admin: staff accounts (create/edit/deactivate, assign roles, reset passwords) |
| `/hub-workers/roles` | Admin: role editor (create/edit roles as named sets of permissions) |

Every route except the auth pages requires a signed-in session (`authGuard`); `/hub-workers*`,
`/reports`, `/urgent-cases`, `/guests*`, and `/followups` additionally require the matching
permission (`permissionGuard`) — see "Authentication, roles & permissions" above. The whole app
is responsive down to phone width: the sidebar becomes an off-canvas drawer behind a hamburger
toggle below 1024px, and dense tables (guest list, hub workers) either scroll horizontally or
collapse into stacked cards on narrow screens.

## Architecture highlights (large-dataset orientation)

- **CQRS**: writes go through EF Core (`IAppDbContext`); list/read endpoints use Dapper with
  hand-written SQL (`Emhip.Infrastructure/Reads/*ReadService.cs`).
- **Keyset (cursor) pagination**: the Guest List and Follow-up queue never use OFFSET/skip —
  see `Emhip.Application.Common.KeysetPage`/`KeysetCursor` and their Dapper implementations.
- **Transactional outbox**: domain events (e.g. a risk flag being raised) are written to an
  `OutboxMessages` table in the same transaction as the triggering change
  (`OutboxSaveChangesInterceptor`), then relayed by `Emhip.Workers.OutboxRelayWorker` to an
  in-process `Channel<T>` consumed by `EscalationWorker`.
- **Read models**: `UrgentCases_ReadModel`, `DashboardSnapshots_ReadModel`,
  `PathwayReportAggregates_ReadModel` are denormalized tables maintained by
  `Emhip.Workers.ReportMaterializerWorker` / `EscalationWorker` — dashboards and reports never
  run a live `GROUP BY` over full history.
- **Streaming export**: `GET /reports/export` streams CSV rows via `IAsyncEnumerable`, never
  buffering the full result set. `GET /reports/export.xlsx` builds a multi-sheet workbook
  (summary, pathways, caseload, DIALOG outcomes, data quality) via ClosedXML.
- **Engagement status vs urgency** (functional spec §3.3/§4.7): a guest's `Status` is one of
  `New` → `Active` → `OnHold` and nothing else. Urgency is a separate `IsUrgent` flag, so a
  safety escalation never erases whether the guest is New or On Hold, and resolving it returns
  them to exactly the state they were in. `New` becomes `Active` only when the initial
  conversation is recorded; `Active` becomes `OnHold` automatically via
  `Emhip.Workers.EngagementStatusWorker` once `LastActivityAt` falls outside the configured
  inactivity window, and any recorded contact flips it straight back.
- **Pathway and allocation history**: `PathwayChanges` and `CaseloadAssignments` are
  append-only records of what changed, why, who authorised it and when — the spec requires both
  to be timestamped and stored historically rather than overwritten on the guest row.
- **Audit trail**: every write is logged via `AuditSaveChangesInterceptor`; every guest-scoped
  read is logged via `AuditReadLoggingMiddleware` — both append-only, per the clinical-data
  compliance requirement in `ARCHITECTURE.md`.

See `project/design_handoff_emhip/ARCHITECTURE.md` for the full original design rationale.

## Known gaps / next steps

- Legacy migration (`POST /admin/migration/guests`) imports guests, demographics, notes and
  DIALOG history from a CSV export with preserved timestamps. Contacts, follow-ups and risk
  history are **not** imported yet — those columns aren't in the template.
- `GuestStatusCountsDto` still names its buckets `pendingConversation`/`inactive` on the wire,
  though the UI labels them New / On hold. Renaming the DTO fields is cosmetic and deferred.
- No dedicated Hubs CRUD API/UI yet — the admin "Hub ID" field on the Hub Workers form is a
  plain GUID text input rather than a picker, since there's no `HubsController` to list them
  from. Hub rows themselves are created by `tools/Emhip.Seeder` or directly in SQL today.
- SQL partitioning/columnstore indexes and moving off the in-process outbox channel, once real
  data volumes are known — see `project/design_handoff_emhip/ARCHITECTURE.md`.
