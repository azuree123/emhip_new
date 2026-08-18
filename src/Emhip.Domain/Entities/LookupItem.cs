using Emhip.Domain.Common;

namespace Emhip.Domain.Entities;

/// <summary>
/// A configurable dropdown option (referral sources, ethnicities, document categories, CMHT
/// teams…). System items are seeded and can be relabelled or deactivated but not deleted, so
/// historical records that reference their code never dangle.
/// </summary>
public class LookupItem : Entity
{
    public string Category { get; private set; } = default!;
    public string Code { get; private set; } = default!;
    public string Label { get; private set; } = default!;
    public int SortOrder { get; private set; }
    public bool IsActive { get; private set; } = true;

    /// <summary>Seeded item — protected from deletion.</summary>
    public bool IsSystem { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    private LookupItem() { }

    public LookupItem(string category, string code, string label, int sortOrder, bool isSystem = false)
    {
        Category = category;
        Code = code;
        Label = label;
        SortOrder = sortOrder;
        IsSystem = isSystem;
        IsActive = true;
        CreatedAt = DateTimeOffset.UtcNow;
        UpdatedAt = CreatedAt;
    }

    public void Update(string label, int sortOrder, bool isActive)
    {
        Label = label;
        SortOrder = sortOrder;
        IsActive = isActive;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
