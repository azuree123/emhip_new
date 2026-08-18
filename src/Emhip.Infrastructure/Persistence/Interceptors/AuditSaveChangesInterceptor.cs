using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Emhip.Infrastructure.Persistence.Interceptors;

/// <summary>
/// Writes an append-only AuditEvent row for every create/update/delete of clinical data, in
/// the same transaction as the change. Clinical-data compliance requirement — see
/// ARCHITECTURE.md "Clinical-data compliance". Read-side audit logging (GET requests) is
/// handled separately by Emhip.Api's audit-logging middleware.
/// </summary>
public sealed class AuditSaveChangesInterceptor(ICurrentUser currentUser) : SaveChangesInterceptor
{
    private static readonly HashSet<Type> AuditedTypes =
    [
        typeof(Guest), typeof(GuestDemographics), typeof(InitialConversationRecord),
        typeof(Contact), typeof(Note), typeof(RiskAssessment), typeof(FollowUp), typeof(PathwayReferral),
        typeof(DialogAssessment), typeof(GuestAction), typeof(GuestClinicalProfile), typeof(UrgentEpisode),
    ];

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        AppendAuditEvents(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        AppendAuditEvents(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void AppendAuditEvents(DbContext? context)
    {
        if (context is null) return;

        var entries = context.ChangeTracker.Entries()
            .Where(e => AuditedTypes.Contains(e.Entity.GetType())
                        && e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .ToList();

        foreach (var entry in entries)
        {
            var action = entry.State switch
            {
                EntityState.Added => AuditAction.Create,
                EntityState.Deleted => AuditAction.Delete,
                _ => AuditAction.Update,
            };

            var guestId = ResolveGuestId(entry);
            var entityId = entry.Property("Id").CurrentValue?.ToString() ?? "unknown";

            context.Set<AuditEvent>().Add(new AuditEvent(guestId, currentUser.StaffId, action, entry.Entity.GetType().Name, entityId, details: null));
        }
    }

    private static Guid? ResolveGuestId(EntityEntry entry)
    {
        if (entry.Entity is Guest guest) return guest.Id;
        var property = entry.Metadata.FindProperty("GuestId");
        return property is not null ? entry.Property("GuestId").CurrentValue as Guid? : null;
    }
}
