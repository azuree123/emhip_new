using System.Text.Json;
using Emhip.Domain.Common;
using Emhip.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Emhip.Workers.Outbox;

/// <summary>
/// Polls OutboxMessages for unprocessed rows and relays them onto the in-process event channel.
/// This is the "worker polls/relays" half of the transactional outbox pattern described in
/// ARCHITECTURE.md — the write half lives in Emhip.Infrastructure's OutboxSaveChangesInterceptor.
/// </summary>
public sealed class OutboxRelayWorker(IServiceScopeFactory scopeFactory, IOutboxEventChannel channel, ILogger<OutboxRelayWorker> logger)
    : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(2);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RelayBatchAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Outbox relay batch failed");
            }

            await Task.Delay(PollInterval, stoppingToken);
        }
    }

    private async Task RelayBatchAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EmhipDbContext>();

        var pending = await db.OutboxMessages
            .Where(m => m.ProcessedAt == null)
            .OrderBy(m => m.OccurredAt)
            .Take(100)
            .ToListAsync(cancellationToken);

        foreach (var message in pending)
        {
            try
            {
                var eventType = Type.GetType(message.Type)
                    ?? throw new InvalidOperationException($"Unknown outbox event type '{message.Type}'.");

                if (JsonSerializer.Deserialize(message.Payload, eventType) is IDomainEvent domainEvent)
                {
                    await channel.PublishAsync(domainEvent, cancellationToken);
                }

                message.MarkProcessed();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to relay outbox message {OutboxMessageId}", message.Id);
                message.MarkFailed(ex.Message);
            }
        }

        if (pending.Count > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
