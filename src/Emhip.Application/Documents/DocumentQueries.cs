using Emhip.Application.Abstractions;
using Emhip.Application.Common;
using Emhip.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Documents;

public sealed record GetDocumentListQuery(
    Guid HubId, string? Q, Guid? GuestId, string? Category, DocumentStatus? Status, string? Tag,
    bool IncludeDeleted, bool DeletedOnly, string? Cursor, int PageSize) : IRequest<KeysetPage<DocumentListItemDto>>;

public sealed class GetDocumentListQueryHandler(IDocumentReadService reads) : IRequestHandler<GetDocumentListQuery, KeysetPage<DocumentListItemDto>>
{
    public Task<KeysetPage<DocumentListItemDto>> Handle(GetDocumentListQuery request, CancellationToken cancellationToken) =>
        reads.GetListAsync(request.HubId, request.Q, request.GuestId, request.Category, request.Status, request.Tag,
            request.IncludeDeleted, request.DeletedOnly, request.Cursor, request.PageSize, cancellationToken);
}

public sealed record GetDocumentDetailQuery(Guid HubId, Guid DocumentId) : IRequest<DocumentDetailDto?>;

public sealed class GetDocumentDetailQueryHandler(IDocumentReadService reads) : IRequestHandler<GetDocumentDetailQuery, DocumentDetailDto?>
{
    public Task<DocumentDetailDto?> Handle(GetDocumentDetailQuery request, CancellationToken cancellationToken) =>
        reads.GetDetailAsync(request.HubId, request.DocumentId, cancellationToken);
}

public sealed record GetDocumentStatsQuery(Guid HubId) : IRequest<DocumentStatsDto>;

public sealed class GetDocumentStatsQueryHandler(IDocumentReadService reads) : IRequestHandler<GetDocumentStatsQuery, DocumentStatsDto>
{
    public Task<DocumentStatsDto> Handle(GetDocumentStatsQuery request, CancellationToken cancellationToken) =>
        reads.GetStatsAsync(request.HubId, cancellationToken);
}

/// <summary>Open stream for a stored version — the caller (controller) owns disposing it.</summary>
public sealed record DocumentDownloadDto(string FileName, string ContentType, long SizeBytes, string Sha256, Stream Content);

/// <summary>Downloads a specific version, or the current one when <paramref name="VersionNumber"/> is null.</summary>
public sealed record GetDocumentDownloadQuery(Guid HubId, Guid DocumentId, int? VersionNumber) : IRequest<DocumentDownloadDto?>;

public sealed class GetDocumentDownloadQueryHandler(IAppDbContext db, IDocumentStorageFactory storageFactory)
    : IRequestHandler<GetDocumentDownloadQuery, DocumentDownloadDto?>
{
    public async Task<DocumentDownloadDto?> Handle(GetDocumentDownloadQuery request, CancellationToken cancellationToken)
    {
        var document = await db.Documents.AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == request.DocumentId && d.HubId == request.HubId, cancellationToken);
        if (document is null) return null;

        var versionNumber = request.VersionNumber ?? document.CurrentVersionNumber;
        var version = await db.DocumentVersions.AsNoTracking()
            .FirstOrDefaultAsync(v => v.DocumentId == document.Id && v.VersionNumber == versionNumber, cancellationToken);
        if (version is null) return null;

        // Read from the provider the bytes were written to, not the currently-active one.
        var storage = await storageFactory.GetAsync(version.StorageProvider, cancellationToken);
        var stream = await storage.OpenReadAsync(version.StorageKey, cancellationToken);

        return new DocumentDownloadDto(version.FileName, version.ContentType, version.SizeBytes, version.Sha256, stream);
    }
}
