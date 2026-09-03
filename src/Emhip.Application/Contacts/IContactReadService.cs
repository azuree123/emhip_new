using Emhip.Application.Common;

namespace Emhip.Application.Contacts;

/// <summary>Read side of the Contacts table for the hub-wide Contact History screen.</summary>
public interface IContactReadService
{
    /// <summary>Keyset-paged contacts across the hub, newest first — never OFFSET/FETCH (see ARCHITECTURE.md).</summary>
    Task<KeysetPage<ContactHistoryRowDto>> GetHubContactHistoryAsync(
        Guid hubId, ContactHistoryFilter filter, string? cursor, int pageSize, CancellationToken cancellationToken = default);

    /// <summary>Contact History screen rows — one per guest with any contact, most recent contact first (keyset-paged).</summary>
    Task<KeysetPage<ContactsByGuestRowDto>> GetContactsByGuestAsync(
        Guid hubId, ContactsByGuestFilter filter, string? cursor, int pageSize, CancellationToken cancellationToken = default);

    /// <summary>The screen's stat tiles for the same caseload scope (CMHW and date range; search and category are ignored).</summary>
    Task<ContactHistorySummaryDto> GetContactHistorySummaryAsync(
        Guid hubId, ContactsByGuestFilter filter, CancellationToken cancellationToken = default);
}
