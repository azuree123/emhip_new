using Emhip.Application.Common;
using Emhip.Domain.Enums;

namespace Emhip.Application.Documents;

public interface IDocumentReadService
{
    /// <summary>Document register — keyset-paginated on (UpdatedAt desc, Id).</summary>
    Task<KeysetPage<DocumentListItemDto>> GetListAsync(
        Guid hubId, string? searchText, Guid? guestId, string? category, DocumentStatus? status,
        string? tag, bool includeDeleted, bool deletedOnly, string? cursor, int pageSize,
        CancellationToken cancellationToken = default);

    /// <summary>Full record with version history. Returns deleted documents too (the UI shows them read-only).</summary>
    Task<DocumentDetailDto?> GetDetailAsync(Guid hubId, Guid documentId, CancellationToken cancellationToken = default);

    Task<DocumentStatsDto> GetStatsAsync(Guid hubId, CancellationToken cancellationToken = default);
}
