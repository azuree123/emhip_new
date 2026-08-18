using Emhip.Application.Abstractions;
using Emhip.Domain.Enums;
using Google;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Storage.V1;

namespace Emhip.Infrastructure.Storage;

/// <summary>Google Cloud Storage bucket, authenticated with a service-account key.</summary>
public sealed class GcsDocumentStorage : IDocumentStorage, IDisposable
{
    private readonly StorageClient _client;
    private readonly string _bucket;

    public GcsDocumentStorage(string bucket, string credentialsJson)
    {
        _bucket = bucket;
        _client = StorageClient.Create(GoogleCredential.FromJson(credentialsJson));
    }

    public DocumentStorageProvider Provider => DocumentStorageProvider.GoogleCloudStorage;

    public async Task<string> SaveAsync(Stream content, string key, string contentType, CancellationToken cancellationToken = default)
    {
        await _client.UploadObjectAsync(_bucket, key, contentType, content, cancellationToken: cancellationToken);
        return key;
    }

    public async Task<Stream> OpenReadAsync(string key, CancellationToken cancellationToken = default)
    {
        // The GCS client writes into a stream we supply rather than handing one back.
        var buffer = new MemoryStream();
        try
        {
            await _client.DownloadObjectAsync(_bucket, key, buffer, cancellationToken: cancellationToken);
        }
        catch (GoogleApiException ex) when (ex.HttpStatusCode == System.Net.HttpStatusCode.NotFound)
        {
            await buffer.DisposeAsync();
            throw new FileNotFoundException($"Stored file not found: {key}", ex);
        }

        buffer.Position = 0;
        return buffer;
    }

    public async Task DeleteAsync(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            await _client.DeleteObjectAsync(_bucket, key, cancellationToken: cancellationToken);
        }
        catch (GoogleApiException ex) when (ex.HttpStatusCode == System.Net.HttpStatusCode.NotFound)
        {
            // Purge must stay idempotent.
        }
    }

    public async Task TestAsync(CancellationToken cancellationToken = default)
    {
        var probeKey = $"_healthcheck/{Guid.NewGuid():N}.txt";
        await using (var probe = new MemoryStream("emhip storage probe"u8.ToArray()))
        {
            await SaveAsync(probe, probeKey, "text/plain", cancellationToken);
        }

        await DeleteAsync(probeKey, cancellationToken);
    }

    public void Dispose() => _client.Dispose();
}
