using Emhip.Domain.Enums;

namespace Emhip.Application.Documents;

/// <summary>Row in the Document Register (list view).</summary>
public sealed record DocumentListItemDto(
    Guid Id,
    Guid? GuestId,
    string? GuestName,
    int? GuestNumber,
    string Title,
    string Category,
    string? Tags,
    DocumentStatus Status,
    int CurrentVersionNumber,
    string FileName,
    string ContentType,
    long SizeBytes,
    DateTimeOffset UpdatedAt,
    string CreatedByName,
    DateOnly? RetainUntil,
    string? CheckedOutByName,
    bool IsDeleted,
    DateTimeOffset? DeletedAt,
    string? DeletedByName);

public sealed record DocumentVersionDto(
    Guid Id,
    int VersionNumber,
    string FileName,
    string ContentType,
    long SizeBytes,
    string Sha256,
    string? ChangeNote,
    string UploadedByName,
    DateTimeOffset UploadedAt,
    DocumentStorageProvider StorageProvider,
    bool IsCurrent);

public sealed record DocumentDetailDto(
    Guid Id,
    Guid? GuestId,
    string? GuestName,
    int? GuestNumber,
    string Title,
    string? Description,
    string Category,
    string? Tags,
    DocumentStatus Status,
    int CurrentVersionNumber,
    DateOnly? RetainUntil,
    Guid? CheckedOutByStaffId,
    string? CheckedOutByName,
    DateTimeOffset? CheckedOutAt,
    string CreatedByName,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    bool IsDeleted,
    DateTimeOffset? DeletedAt,
    string? DeletedByName,
    string? DeleteReason,
    IReadOnlyList<DocumentVersionDto> Versions);

/// <summary>Header tiles on the Documents screen.</summary>
public sealed record DocumentStatsDto(
    int TotalDocuments,
    int ActiveDocuments,
    int ArchivedDocuments,
    int DeletedDocuments,
    int TotalVersions,
    long TotalSizeBytes,
    string ActiveStorageProvider,
    IReadOnlyList<DocumentCategoryCountDto> ByCategory);

public sealed record DocumentCategoryCountDto(string Category, int Count, long SizeBytes);
