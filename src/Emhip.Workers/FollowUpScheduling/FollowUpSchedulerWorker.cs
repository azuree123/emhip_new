using Emhip.Domain.Enums;
using Emhip.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Emhip.Workers.FollowUpScheduling;

/// <summary>Periodically marks scheduled follow-ups whose due date has passed as Overdue — see ARCHITECTURE.md "Follow-up scheduler".</summary>
public sealed class FollowUpSchedulerWorker(IServiceScopeFactory scopeFactory, ILogger<FollowUpSchedulerWorker> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(15);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await MarkOverdueAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Follow-up overdue sweep failed");
            }

            await Task.Delay(Interval, stoppingToken);
        }
    }

    private async Task MarkOverdueAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EmhipDbContext>();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var updated = await db.FollowUps
            .Where(f => f.Status == FollowUpStatus.Scheduled && f.DueDate < today)
            .ExecuteUpdateAsync(setters => setters.SetProperty(f => f.Status, FollowUpStatus.Overdue), cancellationToken);

        if (updated > 0)
        {
            logger.LogInformation("Marked {Count} follow-ups overdue", updated);
        }
    }
}
