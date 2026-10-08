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

/// <summary>
/// Filters for the per-guest view. <paramref name="Category"/> keeps guests with at least one note
/// of that type. <paramref name="CaseloadStaffId"/> is "My caseload": the guests allocated to that
/// staff member, as their assigned CMHW or through a confirmed CPN referral (a CPN is allocated by
/// the MDT queue, not as the guest's CMHW).
/// </summary>
public sealed record ContactsByGuestFilter(
    string? SearchText,
    Guid? AssignedCmhwId,
    ContactHistoryCategory? Category,
    DateOnly? From,
    DateOnly? To,
    Guid? CaseloadStaffId = null);

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

/// <summary>
/// Which stat tile (or CPN figure) a contact list opens. Each kind reads exactly the rows its
/// figure on <see cref="ContactHistorySummaryDto"/> counts, so a list's total is the tile's number.
/// </summary>
public enum ContactListKind
{
    /// <summary>"Total contacts" — every contact, whether or not a casework note backs it.</summary>
    All = 0,
    Casework = 1,
    Activity = 2,
    Hospitality = 3,
    Afa = 4,
    AfaAndHospitality = 5,
    /// <summary>"CPN contacts" — follow-up sessions and the Part 1 initial assessment together.</summary>
    Cpn = 6,
    CpnSessions = 7,
    CpnAssessments = 8,
}

/// <summary>
/// One contact in a tile's list. <paramref name="Id"/> is the row's own record: the casework note,
/// the CPN assessment, or (in the "Total contacts" list) the contact itself.
/// </summary>
public sealed record ContactListRowDto(
    Guid Id,
    Guid GuestId,
    int GuestNumber,
    string GuestName,
    string Type,
    string? Detail,
    ContactType ContactMethod,
    DateTimeOffset OccurredAt,
    string LoggedByName,
    string? AssignedCmhwName);

/// <summary>
/// The type chip and short detail on a contact list row, in the guest Contact History tab's words.
/// A CPN note is a "CPN session" whatever else it carries; a contact with no note behind it (an
/// import, or one logged before casework notes) reads "Contact".
/// </summary>
public static class ContactListLabels
{
    public const string Contact = "Contact";
    public const string CpnSession = "CPN session";
    public const string CpnAssessment = "CPN initial assessment";

    public static string NoteType(bool isCpnContact, CaseworkNoteCategory? category) =>
        isCpnContact
            ? CpnSession
            : category switch
            {
                CaseworkNoteCategory.Casework => "Casework",
                CaseworkNoteCategory.Activity => "Activity",
                CaseworkNoteCategory.Hospitality => "Hospitality",
                CaseworkNoteCategory.Afa => "AFA",
                CaseworkNoteCategory.Meeting => "Meeting",
                CaseworkNoteCategory.DailyLog => "Daily Log",
                _ => Contact,
            };

    /// <summary>The activity attended (or the occasion), the AFA advice given, or "Session N" for a CPN session.</summary>
    public static string? NoteDetail(
        bool isCpnContact, CaseworkNoteCategory? category, int? sessionNumber,
        string? activityType, string? occasion, string? adviceType)
    {
        if (isCpnContact)
        {
            return sessionNumber is null ? null : $"Session {sessionNumber}";
        }
        return category switch
        {
            CaseworkNoteCategory.Activity => OrNull(activityType) ?? OrNull(occasion),
            CaseworkNoteCategory.Afa => OrNull(adviceType),
            _ => null,
        };
    }

    private static string? OrNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
