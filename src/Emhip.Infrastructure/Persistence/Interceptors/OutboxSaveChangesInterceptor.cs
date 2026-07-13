using System.Text.Json;
using Emhip.Domain.Common;
using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Emhip.Infrastructure.Persistence.Interceptors;

/// <summary>
/// Transactional outbox pattern: converts every IHasDomainEvents' pending events into
/// OutboxMessage rows in the *same* SaveChanges call/transaction as the entity change, so the
/// event can never be lost even if the process crashes right after commit. Relayed out-of-band
/// by Emhip.Workers.OutboxRelayWorker. See ARCHITECTURE.md "Escalation worker".
/// </summary>
public sealed class OutboxSaveChangesInterceptor : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        AppendOutboxMessages(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        AppendOutboxMessages(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private static void AppendOutboxMessages(DbContext? context)
    {
        if (context is null) return;

        var entitiesWithEvents = context.ChangeTracker.Entries<IHasDomainEvents>()
            .Select(e => e.Entity)
            .Where(e => e.DomainEvents.Count > 0)
            .ToList();

        foreach (var entity in entitiesWithEvents)
        {
            foreach (var domainEvent in entity.DomainEvents)
            {
                var payload = JsonSerializer.Serialize((object)domainEvent, domainEvent.GetType());
                context.Set<OutboxMessage>().Add(new OutboxMessage(domainEvent.GetType().AssemblyQualifiedName!, payload, domainEvent.OccurredAt));
            }

            entity.ClearDomainEvents();
        }
    }
}
