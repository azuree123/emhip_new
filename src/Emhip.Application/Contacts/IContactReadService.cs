using Emhip.Application.Common;

namespace Emhip.Application.Contacts;

/// <summary>Read side of the Contacts table for the hub-wide Contact History screen.</summary>
public interface IContactReadService
{
    /// <summary>Keyset-paged contacts across the hub, newest first — never OFFSET/FETCH (see ARCHITECTURE.md).</summary>
    Task<KeysetPage<ContactHistoryRowDto>> GetHubContactHistoryAsync(
        Guid hubId, ContactHistoryFilter filter, string? cursor, int pageSize, CancellationToken cancellationToken = default);
}
