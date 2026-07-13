using Emhip.Domain.Common;

namespace Emhip.Domain.Entities;

/// <summary>
/// Transactional outbox row. Written by EF's SaveChangesInterceptor in the same transaction
/// as the entity change, relayed by Emhip.Workers.OutboxRelayWorker.
/// </summary>
public class OutboxMessage : Entity
{
    public string Type { get; private set; } = default!;
    public string Payload { get; private set; } = default!;
    public DateTimeOffset OccurredAt { get; private set; }
    public DateTimeOffset? ProcessedAt { get; private set; }
    public string? Error { get; private set; }
    public int Attempts { get; private set; }

    private OutboxMessage() { }

    public OutboxMessage(string type, string payload, DateTimeOffset occurredAt)
    {
        Type = type;
        Payload = payload;
        OccurredAt = occurredAt;
    }

    public void MarkProcessed() => ProcessedAt = DateTimeOffset.UtcNow;

    public void MarkFailed(string error)
    {
        Error = error;
        Attempts++;
    }
}
