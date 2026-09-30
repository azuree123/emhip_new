using Emhip.Application.Common;
using Emhip.Application.Guests.Dtos;
using Emhip.Domain.Enums;

namespace Emhip.Application.Guests;

/// <summary>
/// Read side of the Guest aggregate (CQRS split — see ARCHITECTURE.md). Implemented with
/// Dapper for the keyset list and with EF Core `AsNoTracking()` projections for the
/// single-guest workspace tabs.
/// </summary>
public interface IGuestReadService
{
    Task<KeysetPage<GuestListItemDto>> GetGuestListAsync(
        Guid hubId, string? searchText, GuestStatus? status, string? cursor, int pageSize,
        PathwayCategory? pathway = null, bool? hasRiskFlags = null, Guid? assignedCmhwId = null,
        int? lastActivityWithinDays = null, bool? urgentOnly = null,
        string? ethnicity = null, string? gender = null, string? countryOfOrigin = null,
        int? ageMin = null, int? ageMax = null, string? segment = null, GuestPathway? clinicalPathway = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CmhwOptionDto>> GetHubCmhwsAsync(Guid hubId, CancellationToken cancellationToken = default);

    /// <summary>Top-bar search autocomplete — top matches by name or guest number.</summary>
    Task<IReadOnlyList<GuestSuggestionDto>> SuggestAsync(Guid hubId, string query, int limit, CancellationToken cancellationToken = default);

    Task<GuestOverviewDto?> GetOverviewAsync(Guid guestId, CancellationToken cancellationToken = default);
    Task<GuestDemographicsDto?> GetDemographicsAsync(Guid guestId, CancellationToken cancellationToken = default);
    Task<GuestClinicalDto?> GetClinicalAsync(Guid guestId, CancellationToken cancellationToken = default);
    Task<GuestPathwayDto?> GetPathwayAsync(Guid guestId, CancellationToken cancellationToken = default);
    Task<GuestFollowUpsDto?> GetFollowUpsAsync(Guid guestId, CancellationToken cancellationToken = default);
    Task<GuestInitialConversationDto?> GetInitialConversationAsync(Guid guestId, CancellationToken cancellationToken = default);
    Task<Dialog.GuestDialogDto?> GetDialogAsync(Guid guestId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Casework.CaseworkNoteDto>> GetCaseworkNotesAsync(Guid guestId, CancellationToken cancellationToken = default);
    Task<CarePlans.GuestCarePlansDto> GetCarePlansAsync(Guid guestId, CancellationToken cancellationToken = default);

    /// <summary>Part 1 of the CPN record, plus whether a new one may be started.</summary>
    Task<Cpn.GuestCpnAssessmentDto> GetCpnAssessmentAsync(Guid guestId, CancellationToken cancellationToken = default);

    /// <summary>Full contact history for the guest, newest first — the workspace Contact History tab.</summary>
    Task<Common.KeysetPage<Dtos.GuestContactSummaryDto>> GetContactHistoryAsync(
        Guid guestId, string? cursor, int pageSize, CancellationToken cancellationToken = default);

    /// <summary>Append-only CMHW allocation history (spec §4.4).</summary>
    Task<IReadOnlyList<Caseload.CaseloadAssignmentDto>> GetCaseloadHistoryAsync(Guid guestId, CancellationToken cancellationToken = default);
    /// <summary>All quick notes for the guest, pinned first — the Notes tab's list.</summary>
    Task<IReadOnlyList<Dtos.GuestNoteDto>> GetNotesAsync(Guid guestId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Actions.GuestActionDto>> GetActionsAsync(Guid guestId, CancellationToken cancellationToken = default);

    /// <summary>The guest's access log (audit events), newest first; empty when the guest is not in the hub.</summary>
    Task<IReadOnlyList<Compliance.GuestAuditEntryDto>> GetAccessLogAsync(Guid hubId, Guid guestId, int limit, CancellationToken cancellationToken = default);
}
