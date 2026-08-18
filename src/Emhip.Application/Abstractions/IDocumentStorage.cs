using Emhip.Domain.Enums;

namespace Emhip.Application.Abstractions;

/// <summary>
/// Blob storage for document bytes. One implementation per backend (local disk, S3/Contabo,
/// Azure Blob, Google Cloud Storage); which one is live is a runtime setting, resolved through
/// <see cref="IDocumentStorageFactory"/> rather than injected directly.
/// </summary>
public interface IDocumentStorage
{
    DocumentStorageProvider Provider { get; }

    /// <summary>Writes the stream under <paramref name="key"/>. Returns the key actually written.</summary>
    Task<string> SaveAsync(Stream content, string key, string contentType, CancellationToken cancellationToken = default);

    /// <summary>Opens the stored object for reading. Throws <see cref="FileNotFoundException"/> when the key is gone.</summary>
    Task<Stream> OpenReadAsync(string key, CancellationToken cancellationToken = default);

    /// <summary>Deletes the object. Missing objects are not an error (purge must stay idempotent).</summary>
    Task DeleteAsync(string key, CancellationToken cancellationToken = default);

    /// <summary>Round-trips a tiny probe object so the Settings page can verify credentials before saving.</summary>
    Task TestAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Builds the storage client from current settings. Uploads use the active provider; downloads
/// and purges use the provider recorded on the version, so switching backends never orphans
/// existing files.
/// </summary>
public interface IDocumentStorageFactory
{
    Task<IDocumentStorage> GetActiveAsync(CancellationToken cancellationToken = default);

    Task<IDocumentStorage> GetAsync(DocumentStorageProvider provider, CancellationToken cancellationToken = default);

    /// <summary>Builds a client from unsaved values (the Settings page's "Test connection" button).</summary>
    Task<IDocumentStorage> BuildAsync(DocumentStorageProvider provider, IReadOnlyDictionary<string, string?> overrides, CancellationToken cancellationToken = default);
}
