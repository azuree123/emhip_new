using Emhip.Application.Abstractions;
using Emhip.Domain.Enums;

namespace Emhip.Infrastructure.Storage;

/// <summary>
/// Files on a server volume (bind-mounted to the host in production, so documents survive
/// container rebuilds). The default for single-server deployments.
/// </summary>
public sealed class LocalDocumentStorage(string root) : IDocumentStorage
{
    public DocumentStorageProvider Provider => DocumentStorageProvider.Local;

    public async Task<string> SaveAsync(Stream content, string key, string contentType, CancellationToken cancellationToken = default)
    {
        var path = ResolvePath(key);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);

        await using var target = File.Create(path);
        await content.CopyToAsync(target, cancellationToken);
        return key;
    }

    public Task<Stream> OpenReadAsync(string key, CancellationToken cancellationToken = default)
    {
        var path = ResolvePath(key);
        if (!File.Exists(path)) throw new FileNotFoundException($"Stored file not found: {key}");
        return Task.FromResult<Stream>(File.OpenRead(path));
    }

    public Task DeleteAsync(string key, CancellationToken cancellationToken = default)
    {
        var path = ResolvePath(key);
        if (File.Exists(path)) File.Delete(path);
        return Task.CompletedTask;
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

    /// <summary>Resolves the key under the root and refuses anything that escapes it.</summary>
    private string ResolvePath(string key)
    {
        var fullRoot = Path.GetFullPath(root);
        var candidate = Path.GetFullPath(Path.Combine(fullRoot, key.Replace('/', Path.DirectorySeparatorChar)));

        if (!candidate.StartsWith(fullRoot, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Resolved storage path escapes the configured root.");
        }

        return candidate;
    }
}
