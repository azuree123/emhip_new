namespace Emhip.Domain.Enums;

/// <summary>
/// Forms that accept admin-defined extra fields. The standardised clinical instruments (DIALOG,
/// risk assessment) are intentionally absent — they must stay fixed for historical comparison
/// and for the escalation logic that reads them.
/// </summary>
public enum CustomFieldEntityType
{
    Guest = 0,
    Document = 1,
    Contact = 2,
    FollowUp = 3,
    GuestAction = 4,
}

public enum CustomFieldType
{
    Text = 0,
    MultilineText = 1,
    Number = 2,
    Date = 3,
    Boolean = 4,
    Select = 5,
    MultiSelect = 6,
}
