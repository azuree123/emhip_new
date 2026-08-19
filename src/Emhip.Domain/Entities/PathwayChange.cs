using Emhip.Domain.Common;
using Emhip.Domain.Enums;

namespace Emhip.Domain.Entities;

/// <summary>
/// An entry in a guest's pathway history: what the pathway changed to, why, who authorised it
/// and when it took effect. Append-only — the history is the audit of clinical decisions, so
/// entries are never edited or removed.
///
/// <see cref="ChangedOn"/> is the clinically meaningful date the worker enters (the design's
/// "Date of change"), which can differ from when the record was typed up.
/// </summary>
public class PathwayChange : Entity
{
    public Guid GuestId { get; private set; }

    /// <summary>Null for the first allocation, so the history can show "initial allocation".</summary>
    public GuestPathway? FromPathway { get; private set; }
    public GuestPathway ToPathway { get; private set; }

    public string? Reason { get; private set; }

    /// <summary>The clinician who authorised the change ("Assigned by"); null when the system allocated it.</summary>
    public Guid? AssignedByStaffId { get; private set; }

    /// <summary>Free-text fallback when the authoriser isn't a portal user.</summary>
    public string? AssignedByName { get; private set; }

    public DateOnly ChangedOn { get; private set; }

    public Guid RecordedByStaffId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    private PathwayChange() { }

    public PathwayChange(
        Guid guestId, GuestPathway? fromPathway, GuestPathway toPathway, string? reason,
        Guid? assignedByStaffId, string? assignedByName, DateOnly changedOn, Guid recordedByStaffId)
    {
        GuestId = guestId;
        FromPathway = fromPathway;
        ToPathway = toPathway;
        Reason = reason;
        AssignedByStaffId = assignedByStaffId;
        AssignedByName = assignedByName;
        ChangedOn = changedOn;
        RecordedByStaffId = recordedByStaffId;
        CreatedAt = DateTimeOffset.UtcNow;
    }
}
