using System.Threading.Channels;
using Emhip.Domain.Common;

namespace Emhip.Workers.Outbox;

public sealed class InProcessOutboxEventChannel : IOutboxEventChannel
{
    // Single consumer (EscalationWorker) for now — a true multi-subscriber fan-out needs one
    // channel per consumer group, which is the natural next step when a second consumer shows up.
    private readonly Channel<IDomainEvent> _channel = Channel.CreateUnbounded<IDomainEvent>(new UnboundedChannelOptions
    {
        SingleReader = true,
        SingleWriter = true,
    });

    public ValueTask PublishAsync(IDomainEvent domainEvent, CancellationToken cancellationToken) =>
        _channel.Writer.WriteAsync(domainEvent, cancellationToken);

    public IAsyncEnumerable<IDomainEvent> ReadAllAsync(CancellationToken cancellationToken) =>
        _channel.Reader.ReadAllAsync(cancellationToken);
}
