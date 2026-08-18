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
        int? lastActivityWithinDays = null, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CmhwOptionDto>> GetHubCmhwsAsync(Guid hubId, CancellationToken cancellationToken = default);

    Task<GuestOverviewDto?> GetOverviewAsync(Guid guestId, CancellationToken cancellationToken = default);
    Task<GuestDemographicsDto?> GetDemographicsAsync(Guid guestId, CancellationToken cancellationToken = default);
    Task<GuestClinicalDto?> GetClinicalAsync(Guid guestId, CancellationToken cancellationToken = default);
    Task<GuestPathwayDto?> GetPathwayAsync(Guid guestId, CancellationToken cancellationToken = default);
    Task<GuestFollowUpsDto?> GetFollowUpsAsync(Guid guestId, CancellationToken cancellationToken = default);
    Task<GuestInitialConversationDto?> GetInitialConversationAsync(Guid guestId, CancellationToken cancellationToken = default);
    Task<Dialog.GuestDialogDto?> GetDialogAsync(Guid guestId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Actions.GuestActionDto>> GetActionsAsync(Guid guestId, CancellationToken cancellationToken = default);
}
