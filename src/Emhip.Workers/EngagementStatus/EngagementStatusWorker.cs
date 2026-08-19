using Emhip.Application.Abstractions;
using Emhip.Application.Settings;
using Emhip.Domain.Enums;
using Emhip.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Emhip.Workers.EngagementStatus;

/// <summary>
/// Automatic engagement-status transitions (spec §4.7): an Active guest with no activity inside
/// the configured window (default 3 months) moves to On Hold. The reverse transition is not done
/// here — recording activity flips the guest back to Active immediately, on the write path.
///
/// The sweep is a set-based update over the indexed LastActivityAt column, so it stays cheap at
/// hub scale. Guests who have never had activity fall back to their registration date, which
/// stops a guest registered a year ago from sitting Active forever.
/// </summary>
public sealed class EngagementStatusWorker(IServiceScopeFactory scopeFactory, ILogger<EngagementStatusWorker> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(6);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SweepAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Engagement status sweep failed");
            }

            await Task.Delay(Interval, stoppingToken);
        }
    }

    private async Task SweepAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EmhipDbContext>();
        var settings = scope.ServiceProvider.GetRequiredService<IAppSettingsService>();

        var inactivityDays = await settings.GetIntAsync(SettingsCatalog.Keys.InactivityDays, 90, cancellationToken);
        var cutoff = DateTimeOffset.UtcNow.AddDays(-inactivityDays);

        var moved = await db.Guests
            .Where(g => g.Status == GuestStatus.Active
                && !g.IsUrgent // an open safety escalation is never quietly parked
                && (g.LastActivityAt == null ? g.RegisteredAt : g.LastActivityAt) < cutoff)
            .ExecuteUpdateAsync(setters => setters.SetProperty(g => g.Status, GuestStatus.OnHold), cancellationToken);

        if (moved > 0)
        {
            logger.LogInformation("Moved {Count} guests to On Hold after {Days} days without activity", moved, inactivityDays);
        }
    }
}
