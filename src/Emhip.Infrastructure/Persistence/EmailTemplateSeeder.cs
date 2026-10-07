using Emhip.Application.Emails;
using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Infrastructure.Persistence;

/// <summary>
/// Inserts any catalog template that isn't in the database yet, and refreshes the wording of
/// templates nobody has edited (so terminology changes such as "Follow-up" → "Contact" or
/// "Urgent Case" reach databases seeded earlier). Rows an admin has saved in the Settings editor
/// keep their subject and body, so their edits survive deployments.
/// </summary>
public static class EmailTemplateSeeder
{
    public static async Task SeedAsync(EmhipDbContext db, CancellationToken cancellationToken = default)
    {
        var existing = await db.EmailTemplates.ToListAsync(cancellationToken);
        var byKey = existing.ToDictionary(t => t.Key, StringComparer.OrdinalIgnoreCase);
        var changed = false;

        foreach (var definition in EmailTemplateCatalog.All)
        {
            if (byKey.TryGetValue(definition.Key, out var template))
            {
                changed |= template.ApplyCatalogDefaults(definition.Name, definition.DefaultSubject, definition.DefaultHtmlBody);
                continue;
            }

            db.EmailTemplates.Add(new EmailTemplate(
                definition.Key, definition.Name, definition.DefaultSubject, definition.DefaultHtmlBody));
            changed = true;
        }

        if (changed) await db.SaveChangesAsync(cancellationToken);
    }
}
