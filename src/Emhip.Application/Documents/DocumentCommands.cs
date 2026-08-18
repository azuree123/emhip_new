using System.Security.Cryptography;
using Emhip.Application.Abstractions;
using Emhip.Application.Settings;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Documents;

/// <summary>Raised when an upload breaks a configured limit (size, file type) — surfaced as 400, not 500.</summary>
public sealed class DocumentUploadRejectedException(string message) : Exception(message);

/// <summary>
/// Creates a document and its first version in one step. The bytes are buffered to a temp file
/// while hashing so the storage client gets a seekable stream it can retry from, then written
/// to whichever provider is active in settings.
/// </summary>
public sealed record UploadDocumentCommand(
    string Title,
    string Category,
    string FileName,
    string ContentType,
    Stream Content,
    long? DeclaredSize,
    Guid? GuestId = null,
    string? Description = null,
    string? Tags = null,
    DateOnly? RetainUntil = null) : IRequest<Guid>;

public sealed class UploadDocumentCommandValidator : AbstractValidator<UploadDocumentCommand>
{
    public UploadDocumentCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(250);
        RuleFor(x => x.Category).NotEmpty().MaximumLength(100);
        RuleFor(x => x.FileName).NotEmpty().MaximumLength(260);
        RuleFor(x => x.Description).MaximumLength(2000);
        RuleFor(x => x.Tags).MaximumLength(500);
    }
}

public sealed class UploadDocumentCommandHandler(
    IAppDbContext db, ICurrentUser currentUser, IDocumentStorageFactory storageFactory, IAppSettingsService settings)
    : IRequestHandler<UploadDocumentCommand, Guid>
{
    public async Task<Guid> Handle(UploadDocumentCommand request, CancellationToken cancellationToken)
    {
        await DocumentUpload.ValidateAsync(settings, request.FileName, request.DeclaredSize, cancellationToken);

        if (request.GuestId is not null)
        {
            var guestInHub = await db.Guests.AsNoTracking()
                .AnyAsync(g => g.Id == request.GuestId && g.HubId == currentUser.HubId, cancellationToken);
            if (!guestInHub) throw new KeyNotFoundException($"Guest {request.GuestId} not found.");
        }

        var document = new Document(
            currentUser.HubId, request.Title, request.Category, currentUser.StaffId,
            request.GuestId, request.Description, request.Tags,
            request.RetainUntil ?? await DocumentUpload.DefaultRetentionAsync(settings, cancellationToken));

        db.Documents.Add(document);

        var version = await DocumentUpload.StoreVersionAsync(
            storageFactory, settings, document, 1, request.FileName, request.ContentType, request.Content,
            currentUser.StaffId, changeNote: "Initial version", cancellationToken);

        db.DocumentVersions.Add(version);
        document.RegisterVersion(1);

        await db.SaveChangesAsync(cancellationToken);
        return document.Id;
    }
}

/// <summary>Uploads a replacement file as the next version. Never mutates previous versions.</summary>
public sealed record AddDocumentVersionCommand(
    Guid DocumentId, string FileName, string ContentType, Stream Content, long? DeclaredSize, string? ChangeNote) : IRequest<int>;

public sealed class AddDocumentVersionCommandHandler(
    IAppDbContext db, ICurrentUser currentUser, IDocumentStorageFactory storageFactory, IAppSettingsService settings)
    : IRequestHandler<AddDocumentVersionCommand, int>
{
    public async Task<int> Handle(AddDocumentVersionCommand request, CancellationToken cancellationToken)
    {
        await DocumentUpload.ValidateAsync(settings, request.FileName, request.DeclaredSize, cancellationToken);

        var document = await DocumentUpload.LoadForWriteAsync(db, currentUser.HubId, request.DocumentId, cancellationToken);
        if (!document.CanEdit(currentUser.StaffId))
        {
            throw new InvalidOperationException("Document is checked out by another user.");
        }

        var nextVersion = document.CurrentVersionNumber + 1;
        var version = await DocumentUpload.StoreVersionAsync(
            storageFactory, settings, document, nextVersion, request.FileName, request.ContentType, request.Content,
            currentUser.StaffId, request.ChangeNote, cancellationToken);

        db.DocumentVersions.Add(version);
        document.RegisterVersion(nextVersion);
        document.CheckIn(currentUser.StaffId, force: true);

        await db.SaveChangesAsync(cancellationToken);
        return nextVersion;
    }
}

public sealed record UpdateDocumentMetadataCommand(
    Guid DocumentId, string Title, string? Description, string Category, string? Tags,
    DocumentStatus Status, DateOnly? RetainUntil) : IRequest;

public sealed class UpdateDocumentMetadataCommandValidator : AbstractValidator<UpdateDocumentMetadataCommand>
{
    public UpdateDocumentMetadataCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(250);
        RuleFor(x => x.Category).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Description).MaximumLength(2000);
        RuleFor(x => x.Tags).MaximumLength(500);
    }
}

public sealed class UpdateDocumentMetadataCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    : IRequestHandler<UpdateDocumentMetadataCommand>
{
    public async Task Handle(UpdateDocumentMetadataCommand request, CancellationToken cancellationToken)
    {
        var document = await DocumentUpload.LoadForWriteAsync(db, currentUser.HubId, request.DocumentId, cancellationToken);
        document.UpdateMetadata(request.Title, request.Description, request.Category, request.Tags, request.Status, request.RetainUntil);
        await db.SaveChangesAsync(cancellationToken);
    }
}

public sealed record DeleteDocumentCommand(Guid DocumentId, string? Reason) : IRequest;

public sealed class DeleteDocumentCommandHandler(IAppDbContext db, ICurrentUser currentUser) : IRequestHandler<DeleteDocumentCommand>
{
    public async Task Handle(DeleteDocumentCommand request, CancellationToken cancellationToken)
    {
        var document = await DocumentUpload.LoadForWriteAsync(db, currentUser.HubId, request.DocumentId, cancellationToken);
        document.SoftDelete(currentUser.StaffId, request.Reason);
        await db.SaveChangesAsync(cancellationToken);
    }
}

public sealed record RestoreDocumentCommand(Guid DocumentId) : IRequest;

public sealed class RestoreDocumentCommandHandler(IAppDbContext db, ICurrentUser currentUser) : IRequestHandler<RestoreDocumentCommand>
{
    public async Task Handle(RestoreDocumentCommand request, CancellationToken cancellationToken)
    {
        var document = await DocumentUpload.LoadForWriteAsync(db, currentUser.HubId, request.DocumentId, cancellationToken);
        document.Restore();
        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>
/// Permanent deletion: removes every stored object, then the rows. Refuses while the retention
/// date is in the future, and only ever applies to documents already in the recycle bin.
/// </summary>
public sealed record PurgeDocumentCommand(Guid DocumentId) : IRequest;

public sealed class PurgeDocumentCommandHandler(IAppDbContext db, ICurrentUser currentUser, IDocumentStorageFactory storageFactory)
    : IRequestHandler<PurgeDocumentCommand>
{
    public async Task Handle(PurgeDocumentCommand request, CancellationToken cancellationToken)
    {
        var document = await DocumentUpload.LoadForWriteAsync(db, currentUser.HubId, request.DocumentId, cancellationToken);

        if (!document.IsDeleted)
        {
            throw new InvalidOperationException("Delete the document before purging it.");
        }

        if (document.IsRetained(DateOnly.FromDateTime(DateTime.UtcNow)))
        {
            throw new InvalidOperationException($"Document is retained until {document.RetainUntil:yyyy-MM-dd} and cannot be purged.");
        }

        var versions = await db.DocumentVersions
            .Where(v => v.DocumentId == document.Id)
            .ToListAsync(cancellationToken);

        foreach (var version in versions)
        {
            var storage = await storageFactory.GetAsync(version.StorageProvider, cancellationToken);
            await storage.DeleteAsync(version.StorageKey, cancellationToken);
        }

        db.DocumentVersions.RemoveRange(versions);
        db.Documents.Remove(document);
        await db.SaveChangesAsync(cancellationToken);
    }
}

public sealed record SetDocumentCheckOutCommand(Guid DocumentId, bool CheckOut, bool Force = false) : IRequest;

public sealed class SetDocumentCheckOutCommandHandler(IAppDbContext db, ICurrentUser currentUser) : IRequestHandler<SetDocumentCheckOutCommand>
{
    public async Task Handle(SetDocumentCheckOutCommand request, CancellationToken cancellationToken)
    {
        var document = await DocumentUpload.LoadForWriteAsync(db, currentUser.HubId, request.DocumentId, cancellationToken);

        if (request.CheckOut) document.CheckOut(currentUser.StaffId);
        else document.CheckIn(currentUser.StaffId, request.Force);

        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Shared upload plumbing: settings-driven validation, hashing, and provider writes.</summary>
internal static class DocumentUpload
{
    internal static async Task<Document> LoadForWriteAsync(IAppDbContext db, Guid hubId, Guid documentId, CancellationToken cancellationToken) =>
        await db.Documents.FirstOrDefaultAsync(d => d.Id == documentId && d.HubId == hubId, cancellationToken)
            ?? throw new KeyNotFoundException($"Document {documentId} not found.");

    internal static async Task ValidateAsync(IAppSettingsService settings, string fileName, long? size, CancellationToken cancellationToken)
    {
        var maxMb = await settings.GetIntAsync(SettingsCatalog.Keys.MaxUploadMb, 25, cancellationToken);
        if (size is not null && size > (long)maxMb * 1024 * 1024)
        {
            throw new DocumentUploadRejectedException($"File exceeds the {maxMb} MB upload limit.");
        }

        if (size is 0)
        {
            throw new DocumentUploadRejectedException("The uploaded file is empty.");
        }

        var allowed = await settings.GetAsync(SettingsCatalog.Keys.AllowedExtensions, cancellationToken)
            ?? SettingsCatalog.DefaultFor(SettingsCatalog.Keys.AllowedExtensions);

        if (string.IsNullOrWhiteSpace(allowed)) return; // blank = allow any type

        var extension = Path.GetExtension(fileName).TrimStart('.').ToLowerInvariant();
        var permitted = allowed.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(e => e.TrimStart('.').ToLowerInvariant())
            .ToHashSet();

        if (!permitted.Contains(extension))
        {
            throw new DocumentUploadRejectedException($"Files of type '.{extension}' are not allowed. Permitted types: {allowed}.");
        }
    }

    internal static async Task<DateOnly?> DefaultRetentionAsync(IAppSettingsService settings, CancellationToken cancellationToken)
    {
        var years = await settings.GetIntAsync(SettingsCatalog.Keys.DefaultRetentionYears, 0, cancellationToken);
        return years > 0 ? DateOnly.FromDateTime(DateTime.UtcNow).AddYears(years) : null;
    }

    internal static async Task<DocumentVersion> StoreVersionAsync(
        IDocumentStorageFactory storageFactory, IAppSettingsService settings, Document document, int versionNumber,
        string fileName, string contentType, Stream content, Guid staffId, string? changeNote,
        CancellationToken cancellationToken)
    {
        var tempPath = Path.Combine(Path.GetTempPath(), $"emhip-upload-{Guid.NewGuid():N}.tmp");
        string sha256;
        long size;

        try
        {
            await using (var temp = File.Create(tempPath))
            using (var hasher = SHA256.Create())
            {
                var buffer = new byte[81920];
                int read;
                size = 0;
                while ((read = await content.ReadAsync(buffer, cancellationToken)) > 0)
                {
                    hasher.TransformBlock(buffer, 0, read, null, 0);
                    await temp.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
                    size += read;
                }

                hasher.TransformFinalBlock([], 0, 0);
                sha256 = Convert.ToHexString(hasher.Hash!).ToLowerInvariant();
            }

            // Re-check against the real byte count — a client can lie about Content-Length.
            await ValidateAsync(settings, fileName, size, cancellationToken);

            var storage = await storageFactory.GetActiveAsync(cancellationToken);
            var key = BuildKey(document, versionNumber, fileName);

            await using var upload = File.OpenRead(tempPath);
            var storedKey = await storage.SaveAsync(upload, key, contentType, cancellationToken);

            return new DocumentVersion(
                document.Id, versionNumber, SafeFileName(fileName), contentType, size,
                storage.Provider, storedKey, sha256, staffId, changeNote);
        }
        finally
        {
            if (File.Exists(tempPath)) File.Delete(tempPath);
        }
    }

    private static string BuildKey(Document document, int versionNumber, string fileName) =>
        $"{document.HubId:N}/{document.Id:N}/v{versionNumber}/{SafeFileName(fileName)}";

    /// <summary>Strips any path components and characters that are awkward in object keys.</summary>
    private static string SafeFileName(string fileName)
    {
        var name = Path.GetFileName(fileName);
        var cleaned = new string(name.Select(c => char.IsLetterOrDigit(c) || c is '.' or '-' or '_' ? c : '-').ToArray());
        return string.IsNullOrWhiteSpace(cleaned) ? "file" : cleaned;
    }
}
