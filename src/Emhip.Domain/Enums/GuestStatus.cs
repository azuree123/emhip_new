namespace Emhip.Domain.Enums;

/// <summary>
/// Engagement status, per the functional spec §4.7. Deliberately only three values: urgency is
/// a separate flag on the guest (<see cref="Entities.Guest.IsUrgent"/>), not a status, because a
/// safety escalation must not erase whether the guest is New, Active or On Hold.
/// </summary>
public enum GuestStatus
{
    /// <summary>Registered, but the initial conversation has not been completed yet.</summary>
    New = 0,

    /// <summary>Activity recorded within the configured window (default 3 months).</summary>
    Active = 1,

    /// <summary>No activity within the window — set automatically by the engagement-status sweep.</summary>
    OnHold = 2,
}
