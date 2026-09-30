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

/// <summary>
/// One row of the Contact History screen (design Desktop 89): a guest with the number of
/// submitted casework notes per contact type, their CPN work (sessions and the Part 1 initial
/// assessment, counted apart from the contact types), and their last contact.
/// </summary>
public sealed record ContactsByGuestRowDto(
    Guid GuestId,
    int GuestNumber,
    string GuestName,
    string GuestStatus,
    GuestPathway? Pathway,
    string? AssignedCmhwName,
    int TotalContacts,
    int CaseworkCount,
    int ActivityCount,
    int HospitalityCount,
    int AfaCount,
    int CpnSessionCount,
    int CpnAssessmentCount,
    DateTimeOffset? LastContactAt);

/// <summary>Filters for the per-guest view. <paramref name="Category"/> keeps guests with at least one note of that type.</summary>
public sealed record ContactsByGuestFilter(
    string? SearchText,
    Guid? AssignedCmhwId,
    ContactHistoryCategory? Category,
    DateOnly? From,
    DateOnly? To);

/// <summary>The "All contacts" dropdown on the Contact History screen.</summary>
public enum ContactHistoryCategory
{
    Casework = 0,
    Activity = 1,
    Hospitality = 2,
    Afa = 3,
    /// <summary>CPN contacts — follow-up sessions and the Part 1 initial assessment.</summary>
    Cpn = 4,
}

/// <summary>
/// The screen's stat tiles — computed over the same caseload scope as the list. CPN work is
/// reported on its own (sessions, initial assessments, guests seen) and is never part of the
/// AFA &amp; Hospitality figure: the two are unrelated pathways.
/// </summary>
public sealed record ContactHistorySummaryDto(
    int TotalContacts,
    int Casework,
    int Activity,
    int AfaAndHospitality,
    int Afa,
    int Hospitality,
    int CpnSessions,
    int CpnAssessments,
    int CpnGuests,
    int GuestsWithContacts);
