using Emhip.Domain.Common;
using Emhip.Domain.Enums;

namespace Emhip.Domain.Entities;

/// <summary>
/// One immutable revision of a <see cref="Document"/>. Rows are never updated after creation —
/// a new upload appends the next version number. The SHA-256 lets the UI prove a download
/// matches what was stored, and records the provider/key so bytes stay findable even after the
/// active storage backend is switched in settings.
/// </summary>
public class DocumentVersion : Entity
{
    public Guid DocumentId { get; private set; }
    public int VersionNumber { get; private set; }

    public string FileName { get; private set; } = default!;
    public string ContentType { get; private set; } = default!;
    public long SizeBytes { get; private set; }

    /// <summary>Provider the bytes were written to — resolved per version, not per document.</summary>
    public DocumentStorageProvider StorageProvider { get; private set; }

    /// <summary>Provider-relative object key (path within the bucket/container/root).</summary>
    public string StorageKey { get; private set; } = default!;

    /// <summary>Lowercase hex SHA-256 of the uploaded bytes.</summary>
    public string Sha256 { get; private set; } = default!;

    public string? ChangeNote { get; private set; }
    public Guid UploadedByStaffId { get; private set; }
    public DateTimeOffset UploadedAt { get; private set; }

    private DocumentVersion() { }

    public DocumentVersion(
        Guid documentId, int versionNumber, string fileName, string contentType, long sizeBytes,
        DocumentStorageProvider storageProvider, string storageKey, string sha256,
        Guid uploadedByStaffId, string? changeNote)
    {
        DocumentId = documentId;
        VersionNumber = versionNumber;
        FileName = fileName;
        ContentType = contentType;
        SizeBytes = sizeBytes;
        StorageProvider = storageProvider;
        StorageKey = storageKey;
        Sha256 = sha256;
        UploadedByStaffId = uploadedByStaffId;
        ChangeNote = changeNote;
        UploadedAt = DateTimeOffset.UtcNow;
    }
}
