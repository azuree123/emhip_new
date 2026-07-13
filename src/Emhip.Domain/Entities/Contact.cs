using Emhip.Domain.Common;
using Emhip.Domain.Enums;

namespace Emhip.Domain.Entities;

/// <summary>
/// A casework contact/follow-up interaction. High-volume table — partitioned by month
/// per ARCHITECTURE.md. Backs the Global Follow-up queue and Guest Workspace "Follow-up" tab.
/// </summary>
public class Contact : Entity
{
    public Guid GuestId { get; private set; }
    public ContactType Type { get; private set; }
    public ContactOutcome Outcome { get; private set; }
    public DateTimeOffset OccurredAt { get; private set; }
    public string? Notes { get; private set; }
    public Guid CreatedByStaffId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    private Contact() { }

    public Contact(Guid guestId, ContactType type, ContactOutcome outcome, DateTimeOffset occurredAt, Guid createdByStaffId, string? notes)
    {
        GuestId = guestId;
        Type = type;
        Outcome = outcome;
        OccurredAt = occurredAt;
        CreatedByStaffId = createdByStaffId;
        Notes = notes;
        CreatedAt = DateTimeOffset.UtcNow;
    }
}
