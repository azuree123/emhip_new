using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Emhip.Application.Abstractions;
using Emhip.Domain.Enums;

namespace Emhip.Infrastructure.Storage;

/// <summary>Azure Blob Storage container, addressed with a connection string.</summary>
public sealed class AzureBlobDocumentStorage(string connectionString, string container) : IDocumentStorage
{
    private readonly BlobContainerClient _container = new(connectionString, container);

    public DocumentStorageProvider Provider => DocumentStorageProvider.AzureBlob;

    public async Task<string> SaveAsync(Stream content, string key, string contentType, CancellationToken cancellationToken = default)
    {
        await _container.CreateIfNotExistsAsync(cancellationToken: cancellationToken);
        var blob = _container.GetBlobClient(key);
        await blob.UploadAsync(content, new BlobUploadOptions { HttpHeaders = new BlobHttpHeaders { ContentType = contentType } }, cancellationToken);
        return key;
    }

    public async Task<Stream> OpenReadAsync(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            return await _container.GetBlobClient(key).OpenReadAsync(cancellationToken: cancellationToken);
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            throw new FileNotFoundException($"Stored file not found: {key}", ex);
        }
    }

    public async Task DeleteAsync(string key, CancellationToken cancellationToken = default) =>
        await _container.GetBlobClient(key).DeleteIfExistsAsync(cancellationToken: cancellationToken);

    public async Task TestAsync(CancellationToken cancellationToken = default)
    {
        var probeKey = $"_healthcheck/{Guid.NewGuid():N}.txt";
        await using (var probe = new MemoryStream("emhip storage probe"u8.ToArray()))
        {
            await SaveAsync(probe, probeKey, "text/plain", cancellationToken);
        }

        await DeleteAsync(probeKey, cancellationToken);
    }
}
