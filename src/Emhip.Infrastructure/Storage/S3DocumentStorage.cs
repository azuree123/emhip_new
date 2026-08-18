using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Emhip.Application.Abstractions;
using Emhip.Domain.Enums;

namespace Emhip.Infrastructure.Storage;

/// <summary>
/// Amazon S3 and every S3-compatible store (Contabo, MinIO, DigitalOcean Spaces, Wasabi…).
/// Compatible providers need a custom service URL and usually path-style addressing; checksum
/// calculation is left "when required" because several of them reject the newer default
/// trailing-checksum headers.
/// </summary>
public sealed class S3DocumentStorage : IDocumentStorage, IDisposable
{
    private readonly IAmazonS3 _client;
    private readonly string _bucket;

    public S3DocumentStorage(DocumentStorageProvider provider, string bucket, string? region, string accessKey, string secretKey, string? serviceUrl, bool forcePathStyle)
    {
        Provider = provider;
        _bucket = bucket;

        var config = new AmazonS3Config
        {
            ForcePathStyle = forcePathStyle,
            RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
            ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED,
        };

        if (!string.IsNullOrWhiteSpace(serviceUrl))
        {
            config.ServiceURL = serviceUrl;
            config.AuthenticationRegion = string.IsNullOrWhiteSpace(region) ? "us-east-1" : region;
        }
        else
        {
            config.RegionEndpoint = Amazon.RegionEndpoint.GetBySystemName(string.IsNullOrWhiteSpace(region) ? "eu-west-2" : region);
        }

        _client = new AmazonS3Client(new BasicAWSCredentials(accessKey, secretKey), config);
    }

    public DocumentStorageProvider Provider { get; }

    public async Task<string> SaveAsync(Stream content, string key, string contentType, CancellationToken cancellationToken = default)
    {
        await _client.PutObjectAsync(new PutObjectRequest
        {
            BucketName = _bucket,
            Key = key,
            InputStream = content,
            ContentType = contentType,
            DisablePayloadSigning = true,
        }, cancellationToken);

        return key;
    }

    public async Task<Stream> OpenReadAsync(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _client.GetObjectAsync(_bucket, key, cancellationToken);
            return response.ResponseStream;
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            throw new FileNotFoundException($"Stored file not found: {key}", ex);
        }
    }

    public async Task DeleteAsync(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            await _client.DeleteObjectAsync(_bucket, key, cancellationToken);
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
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
