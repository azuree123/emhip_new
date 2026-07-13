using Emhip.Application.Abstractions;
using Emhip.Application.UrgentCases;
using Emhip.Domain.Events;
using Emhip.Infrastructure.Persistence;
using Emhip.Infrastructure.ReadModels;
using Emhip.Workers.Outbox;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Emhip.Workers.EscalationHandling;

/// <summary>
/// Consumes RiskFlagRaisedEvent from the outbox channel, upserts the UrgentCases_ReadModel row,
/// and pushes a live SignalR notification. See ARCHITECTURE.md "Escalation worker".
/// </summary>
public sealed class EscalationWorker(IServiceScopeFactory scopeFactory, IOutboxEventChannel channel, ILogger<EscalationWorker> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var domainEvent in channel.ReadAllAsync(stoppingToken))
        {
            if (domainEvent is not RiskFlagRaisedEvent riskFlagRaised) continue;

            try
            {
                await HandleAsync(riskFlagRaised, stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to process RiskFlagRaisedEvent for guest {GuestId}", riskFlagRaised.GuestId);
            }
        }
    }

    private async Task HandleAsync(RiskFlagRaisedEvent evt, CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EmhipDbContext>();
        var notifier = scope.ServiceProvider.GetRequiredService<IUrgentCaseNotifier>();

        var guest = await db.Guests.AsNoTracking().FirstOrDefaultAsync(g => g.Id == evt.GuestId, cancellationToken);
        if (guest is null) return;

        var assignedCmhwName = guest.AssignedCmhwId is null
            ? null
            : await db.Users.AsNoTracking().Where(s => s.Id == guest.AssignedCmhwId).Select(s => s.DisplayName).FirstOrDefaultAsync(cancellationToken);

        var readModel = await db.UrgentCases.FirstOrDefaultAsync(u => u.GuestId == evt.GuestId, cancellationToken);
        if (readModel is null)
        {
            readModel = new UrgentCaseReadModel { GuestId = evt.GuestId };
            db.UrgentCases.Add(readModel);
        }

        readModel.HubId = guest.HubId;
        readModel.GuestName = $"{guest.FirstName} {guest.LastName}";
        readModel.SuicidalIdeation = evt.SuicidalIdeation;
        readModel.SelfHarm = evt.SelfHarm;
        readModel.RiskToOthers = evt.RiskToOthers;
        readModel.SevereDeterioration = evt.SevereDeterioration;
        readModel.SafeguardingConcern = evt.SafeguardingConcern;
        readModel.AssignedCmhwId = guest.AssignedCmhwId;
        readModel.AssignedCmhwName = assignedCmhwName;
        readModel.EscalatedAt = evt.OccurredAt;
        readModel.IsActive = true;

        await db.SaveChangesAsync(cancellationToken);

        var dto = new UrgentCaseDto(
            readModel.GuestId, readModel.GuestName, readModel.SuicidalIdeation, readModel.SelfHarm, readModel.RiskToOthers,
            readModel.SevereDeterioration, readModel.SafeguardingConcern, readModel.AssignedCmhwName, readModel.EscalatedAt);

        await notifier.NotifyUrgentCaseAsync(readModel.HubId, dto, cancellationToken);
    }
}
