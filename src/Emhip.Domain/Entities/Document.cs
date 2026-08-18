using Emhip.Domain.Common;
using Emhip.Domain.Enums;

namespace Emhip.Domain.Entities;

/// <summary>
/// A controlled document. The aggregate holds metadata and the current version pointer;
/// the bytes of every revision live in <see cref="DocumentVersion"/> rows (append-only) so
/// history is never overwritten. Deletion is always soft first — clinical records must be
/// recoverable — with a separate, permission-gated purge that also removes the stored objects.
/// </summary>
public class Document : AggregateRoot
{
    public Guid HubId { get; private set; }

    /// <summary>Set when the document belongs to a guest's record; null for hub-level documents (policies, templates…).</summary>
    public Guid? GuestId { get; private set; }

    public string Title { get; private set; } = default!;
    public string? Description { get; private set; }

    /// <summary>Lookup-driven (LookupItem category "DocumentCategory").</summary>
    public string Category { get; private set; } = default!;

    /// <summary>Comma-separated free-text tags.</summary>
    public string? Tags { get; private set; }

    public DocumentStatus Status { get; private set; }

    /// <summary>Latest version number; matches the highest DocumentVersion.VersionNumber.</summary>
    public int CurrentVersionNumber { get; private set; }

    /// <summary>Retention date — the document should not be purged before this date.</summary>
    public DateOnly? RetainUntil { get; private set; }

    /// <summary>Check-out lock: while set, only this staff member may upload a new version.</summary>
    public Guid? CheckedOutByStaffId { get; private set; }
    public DateTimeOffset? CheckedOutAt { get; private set; }

    public Guid CreatedByStaffId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public bool IsDeleted { get; private set; }
    public DateTimeOffset? DeletedAt { get; private set; }
    public Guid? DeletedByStaffId { get; private set; }
    public string? DeleteReason { get; private set; }

    private Document() { }

    public Document(
        Guid hubId, string title, string category, Guid createdByStaffId,
        Guid? guestId = null, string? description = null, string? tags = null, DateOnly? retainUntil = null)
    {
        HubId = hubId;
        GuestId = guestId;
        Title = title;
        Category = category;
        Description = description;
        Tags = tags;
        RetainUntil = retainUntil;
        Status = DocumentStatus.Active;
        CurrentVersionNumber = 0;
        CreatedByStaffId = createdByStaffId;
        CreatedAt = DateTimeOffset.UtcNow;
        UpdatedAt = CreatedAt;
    }

    public void UpdateMetadata(string title, string? description, string category, string? tags, DocumentStatus status, DateOnly? retainUntil)
    {
        Title = title;
        Description = description;
        Category = category;
        Tags = tags;
        Status = status;
        RetainUntil = retainUntil;
        Touch();
    }

    public void RegisterVersion(int versionNumber)
    {
        CurrentVersionNumber = versionNumber;
        Touch();
    }

    public void CheckOut(Guid staffId)
    {
        if (CheckedOutByStaffId is not null && CheckedOutByStaffId != staffId)
        {
            throw new InvalidOperationException("Document is already checked out by another user.");
        }

        CheckedOutByStaffId = staffId;
        CheckedOutAt = DateTimeOffset.UtcNow;
        Touch();
    }

    /// <summary>Releases the lock. <paramref name="force"/> lets a manager clear someone else's lock.</summary>
    public void CheckIn(Guid staffId, bool force = false)
    {
        if (!force && CheckedOutByStaffId is not null && CheckedOutByStaffId != staffId)
        {
            throw new InvalidOperationException("Document is checked out by another user.");
        }

        CheckedOutByStaffId = null;
        CheckedOutAt = null;
        Touch();
    }

    /// <summary>True when <paramref name="staffId"/> may add a version (no lock, or the lock is theirs).</summary>
    public bool CanEdit(Guid staffId) => CheckedOutByStaffId is null || CheckedOutByStaffId == staffId;

    public void SoftDelete(Guid staffId, string? reason)
    {
        IsDeleted = true;
        DeletedAt = DateTimeOffset.UtcNow;
        DeletedByStaffId = staffId;
        DeleteReason = reason;
        Touch();
    }

    public void Restore()
    {
        IsDeleted = false;
        DeletedAt = null;
        DeletedByStaffId = null;
        DeleteReason = null;
        Touch();
    }

    /// <summary>Retention blocks a purge until the retain-until date has passed.</summary>
    public bool IsRetained(DateOnly today) => RetainUntil is not null && RetainUntil >= today;

    private void Touch() => UpdatedAt = DateTimeOffset.UtcNow;
}
