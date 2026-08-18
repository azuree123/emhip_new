using Emhip.Application.Abstractions;
using Emhip.Application.Settings;
using Emhip.Domain.Entities;
using Emhip.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Emhip.Infrastructure.Settings;

/// <summary>
/// Database-backed settings with a short in-memory cache. Every upload resolves the storage
/// provider through this, so the cache keeps that off the hot path; writes evict immediately so
/// a saved change takes effect on the next request rather than after a TTL.
/// </summary>
public sealed class AppSettingsService(EmhipDbContext db, IMemoryCache cache) : IAppSettingsService
{
    private const string CacheKey = "emhip:settings";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    public async Task<IReadOnlyDictionary<string, string?>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (cache.TryGetValue(CacheKey, out IReadOnlyDictionary<string, string?>? cached) && cached is not null)
        {
            return cached;
        }

        var stored = await db.AppSettings.AsNoTracking()
            .ToDictionaryAsync(s => s.Key, s => s.Value, StringComparer.OrdinalIgnoreCase, cancellationToken);

        cache.Set(CacheKey, (IReadOnlyDictionary<string, string?>)stored, CacheDuration);
        return stored;
    }

    public async Task<string?> GetAsync(string key, CancellationToken cancellationToken = default)
    {
        var all = await GetAllAsync(cancellationToken);
        return all.TryGetValue(key, out var value) && !string.IsNullOrEmpty(value)
            ? value
            : SettingsCatalog.DefaultFor(key);
    }

    public async Task<int> GetIntAsync(string key, int fallback, CancellationToken cancellationToken = default) =>
        int.TryParse(await GetAsync(key, cancellationToken), out var parsed) ? parsed : fallback;

    public async Task<bool> GetBoolAsync(string key, bool fallback, CancellationToken cancellationToken = default) =>
        bool.TryParse(await GetAsync(key, cancellationToken), out var parsed) ? parsed : fallback;

    public async Task SaveAsync(IReadOnlyDictionary<string, string?> values, Guid? updatedByStaffId, CancellationToken cancellationToken = default)
    {
        var keys = values.Keys.ToList();
        var existing = await db.AppSettings.Where(s => keys.Contains(s.Key)).ToListAsync(cancellationToken);

        foreach (var (key, value) in values)
        {
            var row = existing.FirstOrDefault(s => string.Equals(s.Key, key, StringComparison.OrdinalIgnoreCase));
            if (row is null) db.AppSettings.Add(new AppSetting(key, value, updatedByStaffId));
            else row.Update(value, updatedByStaffId);
        }

        await db.SaveChangesAsync(cancellationToken);
        cache.Remove(CacheKey);
    }
}
