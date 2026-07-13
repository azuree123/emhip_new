namespace Emhip.Domain.Common;

/// <summary>
/// Marker for events raised by aggregates. Persisted to the Outbox table in the same
/// transaction as the entity change (transactional outbox pattern) and relayed by
/// Emhip.Workers.OutboxRelayWorker.
/// </summary>
public interface IDomainEvent
{
    DateTimeOffset OccurredAt { get; }
}
