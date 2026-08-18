using System.Collections.Concurrent;
using Emhip.Application.Abstractions;
using Emhip.Application.Settings;
using Emhip.Domain.Enums;

namespace Emhip.Infrastructure.Storage;

/// <summary>
/// Process-wide cache of built storage clients. Cloud SDK clients own connection pools, so they
/// are reused rather than rebuilt per request; the cache key includes every config value, so
/// changing a setting transparently yields a new client.
/// </summary>
public sealed class DocumentStorageClientCache
{
    private readonly ConcurrentDictionary<string, IDocumentStorage> _clients = new();

    public IDocumentStorage GetOrAdd(string signature, Func<IDocumentStorage> factory)
    {
        // Guards against unbounded growth if settings are edited repeatedly.
        if (_clients.Count > 32) _clients.Clear();
        return _clients.GetOrAdd(signature, _ => factory());
    }
}

public sealed class DocumentStorageFactory(IAppSettingsService settings, DocumentStorageClientCache cache) : IDocumentStorageFactory
{
    public async Task<IDocumentStorage> GetActiveAsync(CancellationToken cancellationToken = default)
    {
        var configured = await settings.GetAsync(SettingsCatalog.Keys.StorageProvider, cancellationToken);
        var provider = Enum.TryParse<DocumentStorageProvider>(configured, ignoreCase: true, out var parsed)
            ? parsed
            : DocumentStorageProvider.Local;

        return await GetAsync(provider, cancellationToken);
    }

    public async Task<IDocumentStorage> GetAsync(DocumentStorageProvider provider, CancellationToken cancellationToken = default)
    {
        var stored = await settings.GetAllAsync(cancellationToken);
        return Build(provider, key => Resolve(stored, key));
    }

    public Task<IDocumentStorage> BuildAsync(
        DocumentStorageProvider provider, IReadOnlyDictionary<string, string?> overrides, CancellationToken cancellationToken = default) =>
        BuildWithFallbackAsync(provider, overrides, cancellationToken);

    private async Task<IDocumentStorage> BuildWithFallbackAsync(
        DocumentStorageProvider provider, IReadOnlyDictionary<string, string?> overrides, CancellationToken cancellationToken)
    {
        var stored = await settings.GetAllAsync(cancellationToken);

        // A blank override means "keep what's saved" — secrets are never sent back to the browser,
        // so the test button can verify stored credentials without re-entering them.
        return Build(provider, key =>
            overrides.TryGetValue(key, out var supplied) && !string.IsNullOrWhiteSpace(supplied)
                ? supplied
                : Resolve(stored, key));
    }

    private static string? Resolve(IReadOnlyDictionary<string, string?> stored, string key) =>
        stored.TryGetValue(key, out var value) && !string.IsNullOrEmpty(value) ? value : SettingsCatalog.DefaultFor(key);

    private IDocumentStorage Build(DocumentStorageProvider provider, Func<string, string?> value)
    {
        switch (provider)
        {
            case DocumentStorageProvider.Local:
            {
                var root = value(SettingsCatalog.Keys.LocalRoot) ?? "/var/emhip/documents";
                return cache.GetOrAdd($"local|{root}", () => new LocalDocumentStorage(root));
            }

            case DocumentStorageProvider.AwsS3:
            case DocumentStorageProvider.S3Compatible:
            {
                var bucket = Require(value(SettingsCatalog.Keys.S3Bucket), "bucket");
                var region = value(SettingsCatalog.Keys.S3Region);
                var accessKey = Require(value(SettingsCatalog.Keys.S3AccessKey), "access key");
                var secretKey = Require(value(SettingsCatalog.Keys.S3SecretKey), "secret key");
                var serviceUrl = provider == DocumentStorageProvider.S3Compatible ? value(SettingsCatalog.Keys.S3ServiceUrl) : null;
                var forcePathStyle = provider == DocumentStorageProvider.S3Compatible
                    && !string.Equals(value(SettingsCatalog.Keys.S3ForcePathStyle), "false", StringComparison.OrdinalIgnoreCase);

                if (provider == DocumentStorageProvider.S3Compatible && string.IsNullOrWhiteSpace(serviceUrl))
                {
                    throw new InvalidOperationException("S3-compatible storage needs a service URL (e.g. https://eu2.contabostorage.com).");
                }

                return cache.GetOrAdd(
                    $"s3|{provider}|{bucket}|{region}|{serviceUrl}|{forcePathStyle}|{accessKey}|{Hash(secretKey)}",
                    () => new S3DocumentStorage(provider, bucket, region, accessKey, secretKey, serviceUrl, forcePathStyle));
            }

            case DocumentStorageProvider.AzureBlob:
            {
                var connectionString = Require(value(SettingsCatalog.Keys.AzureConnectionString), "connection string");
                var container = Require(value(SettingsCatalog.Keys.AzureContainer), "container");
                return cache.GetOrAdd($"azure|{container}|{Hash(connectionString)}", () => new AzureBlobDocumentStorage(connectionString, container));
            }

            case DocumentStorageProvider.GoogleCloudStorage:
            {
                var bucket = Require(value(SettingsCatalog.Keys.GcpBucket), "bucket");
                var credentials = Require(value(SettingsCatalog.Keys.GcpCredentialsJson), "service account JSON");
                return cache.GetOrAdd($"gcs|{bucket}|{Hash(credentials)}", () => new GcsDocumentStorage(bucket, credentials));
            }

            default:
                throw new InvalidOperationException($"Unsupported storage provider '{provider}'.");
        }
    }

    private static string Require(string? value, string what) =>
        string.IsNullOrWhiteSpace(value)
            ? throw new InvalidOperationException($"Document storage is missing its {what} — set it on the Settings page.")
            : value;

    /// <summary>Keeps secrets out of the cache key while still varying it when they change.</summary>
    private static string Hash(string value) =>
        Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(value)))[..16];
}
