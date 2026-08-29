# EMHIP Backend Architecture — .NET 10, Large-Dataset Oriented

Proposed implementation architecture for the EMHIP case-management system. Stack per stakeholder decision: **.NET 10 / ASP.NET Core Web API, EF Core + SQL Server, background workers/queues**.

> Assumption: "large dataset" means a high volume of guests, contacts, notes, and audit events accumulated over years across hubs (millions of rows), plus reporting aggregation. Adjust partitioning/scale numbers once real volumes are known.

## Solution layout

```
Emhip.sln
├── src/
│   ├── Emhip.Api/            ASP.NET Core Web API (minimal APIs or controllers)
│   ├── Emhip.Application/    Use cases (CQRS handlers), validation, DTOs
│   ├── Emhip.Domain/         Entities, value objects, domain events
│   ├── Emhip.Infrastructure/ EF Core DbContext, Dapper read models, migrations
│   └── Emhip.Workers/        BackgroundService host: queues, report jobs, escalation
└── tests/
    ├── Emhip.UnitTests/
    └── Emhip.IntegrationTests/   Testcontainers + SQL Server
```

## Core principles for large datasets

1. **CQRS split**: EF Core for writes (change tracking, transactions); Dapper or `AsNoTracking()` compiled queries for reads. Never return unbounded collections.
2. **Keyset (cursor) pagination everywhere** — `WHERE (LastName, GuestId) > (@lastName, @lastId) ORDER BY LastName, GuestId FETCH NEXT 50 ROWS ONLY`. Offset paging degrades past ~100k rows; the Guest List and Follow-up queue must use keyset.
3. **Projection-first reads**: select only list-view columns into DTOs (`.Select(g => new GuestRowDto…)`); the Guest Workspace loads tabs lazily per endpoint.
4. **Streaming for exports/reports**: `IAsyncEnumerable<T>` + `System.Text.Json` streaming serialization; `SqlBulkCopy` for imports.
5. **Read-model tables for dashboards**: dashboard/report aggregates (caseload counts, pathway category totals) are maintained by workers into denormalized tables — never computed with live `GROUP BY` over the full history on request.
6. **Partitioning & indexing**: partition `Contacts` and `AuditEvents` by month; columnstore index on reporting tables; filtered indexes for hot subsets (e.g. `WHERE Status = 'Urgent'`).

## Domain model (from the designs)

- `Guest` (demographics, consent, status) 1—* `Contact` (type, channel, outcome, occurred-at)
- `Guest` 1—* `Note` / `Sticky` (author, pinned, category)
- `Guest` 1—1 `RiskAssessment` (suicidal ideation, self-harm, risk to others, severe deterioration, safeguarding) — versioned, append-only
- `Guest` 1—* `FollowUp` (due date, assignee, status)
- `CaseworkSession` (CMHW calendar events)
- `PathwayReferral` (housing, employment, benefits, food, immigration, legal, other)
- `AuditEvent` — append-only, every read/write of a guest record (clinical-data requirement)

## API surface (maps 1:1 to screens)

- `GET /guests?cursor=&q=&status=` → Guest List (keyset-paginated)
- `POST /guests` → Register New Guest
- `GET /guests/{id}/overview|demographics|clinical|pathway|followups|notes` → Guest Workspace tabs
- `POST /guests/{id}/contacts` → Add Contact
- `GET /followups?due=overdue&assignee=me` → Follow-up queue
- `GET /urgent-cases` → Urgent Cases (served from read model, pushed via SignalR)
- `GET /dashboards/cmhw` / `GET /dashboards/hub-manager` → precomputed read models
- `GET /reports/pathways?from=&to=` → columnstore-backed aggregates; `GET /reports/export` streams CSV

## Background workers (Emhip.Workers)

- **Escalation worker**: consumes domain events (risk flag raised) from an outbox table → updates Urgent Cases read model → SignalR broadcast. Use the transactional outbox pattern (EF Core saves event + entity atomically; worker polls/relays).
- **Report materializer**: nightly + incremental refresh of reporting tables.
- **Follow-up scheduler**: marks overdue, generates dashboard counts.
- Queue: start with SQL-backed outbox + `Channel<T>` in-process; move to Azure Service Bus / RabbitMQ when hubs scale out.

## Cross-cutting

- **Auth**: OpenID Connect (Entra ID); roles `CMHW`, `HubManager`; row-level scoping by hub.
- **Clinical-data compliance**: audit interceptor (EF `SaveChangesInterceptor` + read logging middleware); soft delete only; encryption at rest (TDE) and column-level for identifiers.
- **Observability**: OpenTelemetry traces + SQL query metrics; slow-query budget alerts (p95 < 100 ms for list endpoints).
- **Migrations**: EF Core migrations in CI; `dotnet ef migrations bundle` for deploys.

## Suggested first milestones

1. Scaffold solution, `Guest` aggregate, Register New Guest + Guest List (keyset paging) end-to-end.
2. Guest Workspace tabs + Add Contact + audit interceptor.
3. Risk assessment + outbox + Urgent Cases live queue.
4. Dashboards/read models, then Reports + streaming export.
