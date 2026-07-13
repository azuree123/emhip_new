using Emhip.Domain.Common;
using Emhip.Domain.Enums;

namespace Emhip.Domain.Entities;

/// <summary>
/// Append-only record of every read/write of clinical data (compliance requirement).
/// Written by the SaveChangesInterceptor for writes and by read-logging middleware for
/// reads. High volume — partitioned by month per ARCHITECTURE.md.
/// </summary>
public class AuditEvent : Entity
{
    public Guid? GuestId { get; private set; }
    public Guid ActorStaffId { get; private set; }
    public AuditAction Action { get; private set; }
    public string EntityName { get; private set; } = default!;
    public string EntityId { get; private set; } = default!;
    public string? Details { get; private set; }
    public DateTimeOffset OccurredAt { get; private set; }

    private AuditEvent() { }

    public AuditEvent(Guid? guestId, Guid actorStaffId, AuditAction action, string entityName, string entityId, string? details)
    {
        GuestId = guestId;
        ActorStaffId = actorStaffId;
        Action = action;
        EntityName = entityName;
        EntityId = entityId;
        Details = details;
        OccurredAt = DateTimeOffset.UtcNow;
    }
}
