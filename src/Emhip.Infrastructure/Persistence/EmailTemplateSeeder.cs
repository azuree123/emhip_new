using Emhip.Application.Emails;
using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Infrastructure.Persistence;

/// <summary>
/// Inserts any catalog template that isn't in the database yet. Existing rows are never
/// overwritten, so edits made in the Settings editor survive deployments while newly added
/// templates still appear automatically.
/// </summary>
public static class EmailTemplateSeeder
{
    public static async Task SeedAsync(EmhipDbContext db, CancellationToken cancellationToken = default)
    {
        var existing = await db.EmailTemplates.AsNoTracking()
            .Select(t => t.Key)
            .ToListAsync(cancellationToken);

        var known = existing.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var added = false;

        foreach (var definition in EmailTemplateCatalog.All)
        {
            if (!known.Add(definition.Key)) continue;

            db.EmailTemplates.Add(new EmailTemplate(
                definition.Key, definition.Name, definition.DefaultSubject, definition.DefaultHtmlBody));
            added = true;
        }

        if (added) await db.SaveChangesAsync(cancellationToken);
    }
}
