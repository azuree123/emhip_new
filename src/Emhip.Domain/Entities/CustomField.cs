using Emhip.Domain.Common;
using Emhip.Domain.Enums;

namespace Emhip.Domain.Entities;

/// <summary>
/// An admin-defined extra field on one of the configurable forms. Definitions are metadata only;
/// the captured data lives in <see cref="CustomFieldValue"/> with typed columns so it stays
/// queryable and exportable rather than disappearing into an untyped blob.
///
/// Deliberately scoped: the standardised clinical instruments (DIALOG, risk assessment) are not
/// extensible, because altering them would invalidate historical comparison and the escalation
/// rules that read them.
/// </summary>
public class CustomFieldDefinition : Entity
{
    public CustomFieldEntityType EntityType { get; private set; }

    /// <summary>Stable slug used in payloads and exports; unique per entity type and never edited.</summary>
    public string Key { get; private set; } = default!;

    public string Label { get; private set; } = default!;
    public CustomFieldType FieldType { get; private set; }

    /// <summary>Newline-separated choices for Select/MultiSelect fields.</summary>
    public string? Options { get; private set; }

    public string? HelpText { get; private set; }
    public bool IsRequired { get; private set; }
    public int SortOrder { get; private set; }
    public bool IsActive { get; private set; } = true;

    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    private CustomFieldDefinition() { }

    public CustomFieldDefinition(
        CustomFieldEntityType entityType, string key, string label, CustomFieldType fieldType,
        string? options, string? helpText, bool isRequired, int sortOrder)
    {
        EntityType = entityType;
        Key = key;
        Label = label;
        FieldType = fieldType;
        Options = options;
        HelpText = helpText;
        IsRequired = isRequired;
        SortOrder = sortOrder;
        IsActive = true;
        CreatedAt = DateTimeOffset.UtcNow;
        UpdatedAt = CreatedAt;
    }

    /// <summary>The key and entity type are immutable — existing values reference them.</summary>
    public void Update(string label, CustomFieldType fieldType, string? options, string? helpText, bool isRequired, int sortOrder, bool isActive)
    {
        Label = label;
        FieldType = fieldType;
        Options = options;
        HelpText = helpText;
        IsRequired = isRequired;
        SortOrder = sortOrder;
        IsActive = isActive;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public IReadOnlyList<string> OptionList() =>
        string.IsNullOrWhiteSpace(Options)
            ? []
            : Options.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}

/// <summary>
/// One captured value. Stored in the column matching its definition's type so reports and
/// filters can use it directly; MultiSelect keeps its selections newline-separated in
/// <see cref="ValueText"/>.
/// </summary>
public class CustomFieldValue : Entity
{
    public Guid DefinitionId { get; private set; }
    public CustomFieldEntityType EntityType { get; private set; }
    public Guid EntityId { get; private set; }

    public string? ValueText { get; private set; }
    public decimal? ValueNumber { get; private set; }
    public DateOnly? ValueDate { get; private set; }
    public bool? ValueBoolean { get; private set; }

    public DateTimeOffset UpdatedAt { get; private set; }
    public Guid? UpdatedByStaffId { get; private set; }

    private CustomFieldValue() { }

    public CustomFieldValue(Guid definitionId, CustomFieldEntityType entityType, Guid entityId)
    {
        DefinitionId = definitionId;
        EntityType = entityType;
        EntityId = entityId;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Set(string? text, decimal? number, DateOnly? date, bool? boolean, Guid? updatedByStaffId)
    {
        ValueText = text;
        ValueNumber = number;
        ValueDate = date;
        ValueBoolean = boolean;
        UpdatedAt = DateTimeOffset.UtcNow;
        UpdatedByStaffId = updatedByStaffId;
    }

    /// <summary>True when nothing has been entered — used to enforce "required" and to skip empty rows.</summary>
    public bool IsEmpty =>
        string.IsNullOrWhiteSpace(ValueText) && ValueNumber is null && ValueDate is null && ValueBoolean is null;
}
