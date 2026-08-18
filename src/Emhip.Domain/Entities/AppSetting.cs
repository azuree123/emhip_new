using Emhip.Domain.Common;

namespace Emhip.Domain.Entities;

/// <summary>
/// A single configuration value editable from the portal's Settings page. The catalog of known
/// keys (labels, types, sections, defaults) lives in the application layer; this table only
/// stores overrides, so an unset key falls back to its catalog default.
/// </summary>
public class AppSetting : Entity
{
    public string Key { get; private set; } = default!;
    public string? Value { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public Guid? UpdatedByStaffId { get; private set; }

    private AppSetting() { }

    public AppSetting(string key, string? value, Guid? updatedByStaffId)
    {
        Key = key;
        Value = value;
        UpdatedAt = DateTimeOffset.UtcNow;
        UpdatedByStaffId = updatedByStaffId;
    }

    public void Update(string? value, Guid? updatedByStaffId)
    {
        Value = value;
        UpdatedAt = DateTimeOffset.UtcNow;
        UpdatedByStaffId = updatedByStaffId;
    }
}
