using Emhip.Domain.Common;

namespace Emhip.Workers.Outbox;

/// <summary>
/// In-process Channel&lt;T&gt; fan-out from the outbox relay to consumer workers (Escalation,
/// dashboard/report updates). Per ARCHITECTURE.md: "start with SQL-backed outbox + Channel&lt;T&gt;
/// in-process; move to Azure Service Bus / RabbitMQ when hubs scale out" — swapping the
/// implementation of this interface is the seam for that later move.
/// </summary>
public interface IOutboxEventChannel
{
    ValueTask PublishAsync(IDomainEvent domainEvent, CancellationToken cancellationToken);
    IAsyncEnumerable<IDomainEvent> ReadAllAsync(CancellationToken cancellationToken);
}
