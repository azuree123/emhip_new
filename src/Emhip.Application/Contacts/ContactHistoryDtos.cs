using Emhip.Domain.Enums;

namespace Emhip.Application.Contacts;

/// <summary>
/// One row of the hub-wide "Contact History" screen — every contact logged against any guest
/// in the caller's hub, newest first. Projection-only: the screen never receives Contact
/// entities.
/// </summary>
public sealed record ContactHistoryRowDto(
    Guid Id,
    Guid GuestId,
    int GuestNumber,
    string GuestName,
    string GuestStatus,
    string Type,
    string Outcome,
    DateTimeOffset OccurredAt,
    string? Notes,
    Guid CreatedByStaffId,
    string CreatedByName,
    string? AssignedCmhwName);

/// <summary>Filters accepted by the hub-wide contact history — all optional and combinable.</summary>
public sealed record ContactHistoryFilter(
    string? SearchText,
    Guid? GuestId,
    Guid? CreatedByStaffId,
    Guid? AssignedCmhwId,
    ContactType? Type,
    ContactOutcome? Outcome,
    DateOnly? From,
    DateOnly? To);
