using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;

namespace Emhip.Infrastructure.Persistence;

public sealed class AuditTrail(EmhipDbContext db, ICurrentUser currentUser) : IAuditTrail
{
    public async Task RecordAsync(Guid? guestId, AuditAction action, string entityName, string entityId, string? details, CancellationToken cancellationToken = default)
    {
        db.AuditEvents.Add(new AuditEvent(guestId, currentUser.StaffId, action, entityName, entityId, details));
        await db.SaveChangesAsync(cancellationToken);
    }
}
