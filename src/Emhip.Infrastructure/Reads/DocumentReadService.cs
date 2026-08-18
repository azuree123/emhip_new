using Emhip.Application.Common;
using Emhip.Application.Documents;
using Emhip.Application.Settings;
using Emhip.Domain.Enums;
using Emhip.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Infrastructure.Reads;

/// <summary>
/// Read side of the document register. Keyset-paginated on (UpdatedAt desc, Id desc) so the
/// list stays stable as documents are edited, with the current version's file details pulled in
/// via a correlated subquery rather than loading every version.
/// </summary>
public sealed class DocumentReadService(EmhipDbContext db, Application.Abstractions.IAppSettingsService settings) : IDocumentReadService
{
    private sealed record DocumentCursor(DateTimeOffset UpdatedAt, Guid Id);

    public async Task<KeysetPage<DocumentListItemDto>> GetListAsync(
        Guid hubId, string? searchText, Guid? guestId, string? category, DocumentStatus? status,
        string? tag, bool includeDeleted, bool deletedOnly, string? cursor, int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = Filtered(hubId, searchText, guestId, category, status, tag, includeDeleted, deletedOnly);

        var decoded = KeysetCursor.Decode<DocumentCursor>(cursor);
        if (decoded is not null)
        {
            query = query.Where(d => d.UpdatedAt < decoded.UpdatedAt || (d.UpdatedAt == decoded.UpdatedAt && d.Id.CompareTo(decoded.Id) < 0));
        }

        var rows = await query
            .OrderByDescending(d => d.UpdatedAt).ThenByDescending(d => d.Id)
            .Take(pageSize + 1)
            .Select(d => new DocumentListItemDto(
                d.Id, d.GuestId,
                db.Guests.Where(g => g.Id == d.GuestId).Select(g => g.FirstName + " " + g.LastName).FirstOrDefault(),
                db.Guests.Where(g => g.Id == d.GuestId).Select(g => (int?)g.GuestNumber).FirstOrDefault(),
                d.Title, d.Category, d.Tags, d.Status, d.CurrentVersionNumber,
                db.DocumentVersions.Where(v => v.DocumentId == d.Id && v.VersionNumber == d.CurrentVersionNumber).Select(v => v.FileName).FirstOrDefault() ?? string.Empty,
                db.DocumentVersions.Where(v => v.DocumentId == d.Id && v.VersionNumber == d.CurrentVersionNumber).Select(v => v.ContentType).FirstOrDefault() ?? string.Empty,
                db.DocumentVersions.Where(v => v.DocumentId == d.Id && v.VersionNumber == d.CurrentVersionNumber).Select(v => v.SizeBytes).FirstOrDefault(),
                d.UpdatedAt,
                db.Users.Where(u => u.Id == d.CreatedByStaffId).Select(u => u.DisplayName).FirstOrDefault() ?? "Unknown",
                d.RetainUntil,
                db.Users.Where(u => u.Id == d.CheckedOutByStaffId).Select(u => u.DisplayName).FirstOrDefault(),
                d.IsDeleted, d.DeletedAt,
                db.Users.Where(u => u.Id == d.DeletedByStaffId).Select(u => u.DisplayName).FirstOrDefault()))
            .ToListAsync(cancellationToken);

        var hasMore = rows.Count > pageSize;
        var page = rows.Take(pageSize).ToList();

        int? totalCount = decoded is null
            ? await Filtered(hubId, searchText, guestId, category, status, tag, includeDeleted, deletedOnly).CountAsync(cancellationToken)
            : null;

        return new KeysetPage<DocumentListItemDto>
        {
            Items = page,
            NextCursor = hasMore ? KeysetCursor.Encode(new DocumentCursor(page[^1].UpdatedAt, page[^1].Id)) : null,
            HasMore = hasMore,
            TotalCount = totalCount,
        };
    }

    public async Task<DocumentDetailDto?> GetDetailAsync(Guid hubId, Guid documentId, CancellationToken cancellationToken = default)
    {
        var document = await db.Documents.AsNoTracking()
            .Where(d => d.Id == documentId && d.HubId == hubId)
            .Select(d => new
            {
                d.Id, d.GuestId, d.Title, d.Description, d.Category, d.Tags, d.Status, d.CurrentVersionNumber,
                d.RetainUntil, d.CheckedOutByStaffId, d.CheckedOutAt, d.CreatedAt, d.UpdatedAt,
                d.IsDeleted, d.DeletedAt, d.DeleteReason,
                GuestName = db.Guests.Where(g => g.Id == d.GuestId).Select(g => g.FirstName + " " + g.LastName).FirstOrDefault(),
                GuestNumber = db.Guests.Where(g => g.Id == d.GuestId).Select(g => (int?)g.GuestNumber).FirstOrDefault(),
                CreatedByName = db.Users.Where(u => u.Id == d.CreatedByStaffId).Select(u => u.DisplayName).FirstOrDefault() ?? "Unknown",
                CheckedOutByName = db.Users.Where(u => u.Id == d.CheckedOutByStaffId).Select(u => u.DisplayName).FirstOrDefault(),
                DeletedByName = db.Users.Where(u => u.Id == d.DeletedByStaffId).Select(u => u.DisplayName).FirstOrDefault(),
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (document is null) return null;

        var versions = await db.DocumentVersions.AsNoTracking()
            .Where(v => v.DocumentId == documentId)
            .OrderByDescending(v => v.VersionNumber)
            .Select(v => new DocumentVersionDto(
                v.Id, v.VersionNumber, v.FileName, v.ContentType, v.SizeBytes, v.Sha256, v.ChangeNote,
                db.Users.Where(u => u.Id == v.UploadedByStaffId).Select(u => u.DisplayName).FirstOrDefault() ?? "Unknown",
                v.UploadedAt, v.StorageProvider, v.VersionNumber == document.CurrentVersionNumber))
            .ToListAsync(cancellationToken);

        return new DocumentDetailDto(
            document.Id, document.GuestId, document.GuestName, document.GuestNumber,
            document.Title, document.Description, document.Category, document.Tags, document.Status,
            document.CurrentVersionNumber, document.RetainUntil,
            document.CheckedOutByStaffId, document.CheckedOutByName, document.CheckedOutAt,
            document.CreatedByName, document.CreatedAt, document.UpdatedAt,
            document.IsDeleted, document.DeletedAt, document.DeletedByName, document.DeleteReason,
            versions);
    }

    public async Task<DocumentStatsDto> GetStatsAsync(Guid hubId, CancellationToken cancellationToken = default)
    {
        var documents = db.Documents.AsNoTracking().Where(d => d.HubId == hubId);

        var counts = await documents
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Total = g.Count(),
                Active = g.Count(d => !d.IsDeleted && d.Status == DocumentStatus.Active),
                Archived = g.Count(d => !d.IsDeleted && d.Status == DocumentStatus.Archived),
                Deleted = g.Count(d => d.IsDeleted),
            })
            .FirstOrDefaultAsync(cancellationToken);

        var versionStats = await db.DocumentVersions.AsNoTracking()
            .Where(v => db.Documents.Any(d => d.Id == v.DocumentId && d.HubId == hubId))
            .GroupBy(_ => 1)
            .Select(g => new { Count = g.Count(), Size = (long?)g.Sum(v => v.SizeBytes) ?? 0 })
            .FirstOrDefaultAsync(cancellationToken);

        var byCategory = await documents
            .Where(d => !d.IsDeleted)
            .GroupBy(d => d.Category)
            .Select(g => new DocumentCategoryCountDto(
                g.Key,
                g.Count(),
                (long?)db.DocumentVersions.Where(v => g.Select(d => d.Id).Contains(v.DocumentId)).Sum(v => v.SizeBytes) ?? 0))
            .ToListAsync(cancellationToken);

        var provider = await settings.GetAsync(SettingsCatalog.Keys.StorageProvider, cancellationToken) ?? "Local";

        return new DocumentStatsDto(
            counts?.Total ?? 0, counts?.Active ?? 0, counts?.Archived ?? 0, counts?.Deleted ?? 0,
            versionStats?.Count ?? 0, versionStats?.Size ?? 0, provider,
            byCategory.OrderByDescending(c => c.Count).ToList());
    }

    private IQueryable<Domain.Entities.Document> Filtered(
        Guid hubId, string? searchText, Guid? guestId, string? category, DocumentStatus? status,
        string? tag, bool includeDeleted, bool deletedOnly)
    {
        var query = db.Documents.AsNoTracking().Where(d => d.HubId == hubId);

        query = deletedOnly ? query.Where(d => d.IsDeleted)
            : includeDeleted ? query
            : query.Where(d => !d.IsDeleted);

        if (guestId is not null) query = query.Where(d => d.GuestId == guestId);
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(d => d.Category == category);
        if (status is not null) query = query.Where(d => d.Status == status);
        if (!string.IsNullOrWhiteSpace(tag)) query = query.Where(d => d.Tags != null && d.Tags.Contains(tag));

        if (!string.IsNullOrWhiteSpace(searchText))
        {
            query = query.Where(d =>
                d.Title.Contains(searchText)
                || (d.Description != null && d.Description.Contains(searchText))
                || (d.Tags != null && d.Tags.Contains(searchText))
                || db.DocumentVersions.Any(v => v.DocumentId == d.Id && v.FileName.Contains(searchText)));
        }

        return query;
    }
}
