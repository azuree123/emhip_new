namespace Emhip.Application.Abstractions;

/// <summary>
/// Reads and writes portal settings. Values are cached in memory and invalidated on write, so
/// hot paths (every upload resolves the storage provider) don't hit the database each time.
/// Falls back to the catalog default when a key has never been saved.
/// </summary>
public interface IAppSettingsService
{
    Task<string?> GetAsync(string key, CancellationToken cancellationToken = default);

    Task<IReadOnlyDictionary<string, string?>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<int> GetIntAsync(string key, int fallback, CancellationToken cancellationToken = default);

    Task<bool> GetBoolAsync(string key, bool fallback, CancellationToken cancellationToken = default);

    /// <summary>Upserts the given keys. Unknown keys are rejected by the caller (the controller validates against the catalog).</summary>
    Task SaveAsync(IReadOnlyDictionary<string, string?> values, Guid? updatedByStaffId, CancellationToken cancellationToken = default);
}
