using Emhip.Domain.Common;

namespace Emhip.Domain.Entities;

/// <summary>
/// An editable transactional email. Templates are seeded with sensible defaults and identified
/// by a stable <see cref="Key"/> that the code sends against, so admins can rewrite the wording
/// without touching the trigger. Placeholders are <c>{{token}}</c> pairs listed per template in
/// the catalog.
/// </summary>
public class EmailTemplate : Entity
{
    public string Key { get; private set; } = default!;
    public string Name { get; private set; } = default!;
    public string Subject { get; private set; } = default!;
    public string HtmlBody { get; private set; } = default!;

    /// <summary>Plain-text alternative. Auto-derived from the HTML when left blank.</summary>
    public string? TextBody { get; private set; }

    /// <summary>Disabled templates are skipped by their trigger — the surrounding action still succeeds.</summary>
    public bool IsEnabled { get; private set; } = true;

    public DateTimeOffset UpdatedAt { get; private set; }
    public Guid? UpdatedByStaffId { get; private set; }

    private EmailTemplate() { }

    public EmailTemplate(string key, string name, string subject, string htmlBody, string? textBody = null)
    {
        Key = key;
        Name = name;
        Subject = subject;
        HtmlBody = htmlBody;
        TextBody = textBody;
        IsEnabled = true;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    /// <summary>True once an admin has saved the template in the Settings editor.</summary>
    public bool IsCustomised => UpdatedByStaffId is not null;

    /// <summary>
    /// Brings the catalog's current wording onto the row. The name is not admin-editable, so it
    /// always follows the catalog; subject and body only while nobody has customised them.
    /// Returns whether anything changed.
    /// </summary>
    public bool ApplyCatalogDefaults(string name, string subject, string htmlBody)
    {
        var changed = Name != name;
        Name = name;
        if (!IsCustomised && (Subject != subject || HtmlBody != htmlBody))
        {
            Subject = subject;
            HtmlBody = htmlBody;
            TextBody = null;
            changed = true;
        }
        if (changed) UpdatedAt = DateTimeOffset.UtcNow;
        return changed;
    }

    public void Update(string subject, string htmlBody, string? textBody, bool isEnabled, Guid? updatedByStaffId)
    {
        Subject = subject;
        HtmlBody = htmlBody;
        TextBody = textBody;
        IsEnabled = isEnabled;
        UpdatedAt = DateTimeOffset.UtcNow;
        UpdatedByStaffId = updatedByStaffId;
    }
}
