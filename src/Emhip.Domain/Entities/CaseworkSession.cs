using Emhip.Domain.Common;
using Emhip.Domain.Enums;

namespace Emhip.Domain.Entities;

/// <summary>A CMHW calendar event (casework session with a guest).</summary>
public class CaseworkSession : Entity
{
    public Guid GuestId { get; private set; }
    public Guid StaffId { get; private set; }
    public DateTimeOffset ScheduledAt { get; private set; }
    public int DurationMinutes { get; private set; }
    public string? Location { get; private set; }
    public CaseworkSessionStatus Status { get; private set; }

    private CaseworkSession() { }

    public CaseworkSession(Guid guestId, Guid staffId, DateTimeOffset scheduledAt, int durationMinutes, string? location)
    {
        GuestId = guestId;
        StaffId = staffId;
        ScheduledAt = scheduledAt;
        DurationMinutes = durationMinutes;
        Location = location;
        Status = CaseworkSessionStatus.Scheduled;
    }

    public void Complete() => Status = CaseworkSessionStatus.Completed;
    public void Cancel() => Status = CaseworkSessionStatus.Cancelled;
    public void MarkNoShow() => Status = CaseworkSessionStatus.NoShow;
}
