using Emhip.Application.Abstractions;
using Emhip.Application.Emails;
using Emhip.Application.Settings;
using Emhip.Application.UrgentCases;
using Emhip.Domain.Events;
using Emhip.Infrastructure.Persistence;
using Emhip.Infrastructure.ReadModels;
using Emhip.Workers.Outbox;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
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
            try
            {
                switch (domainEvent)
                {
                    case RiskFlagRaisedEvent riskFlagRaised:
                        await HandleAsync(riskFlagRaised, stoppingToken);
                        break;
                    case UrgentCaseResolvedEvent resolved:
                        await HandleResolvedAsync(resolved, stoppingToken);
                        break;
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to process {EventType}", domainEvent.GetType().Name);
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
            readModel.GuestId, readModel.GuestName, guest.GuestNumber, readModel.SuicidalIdeation, readModel.SelfHarm,
            readModel.RiskToOthers, readModel.SevereDeterioration, readModel.SafeguardingConcern,
            readModel.AssignedCmhwName, readModel.EscalatedAt);

        await notifier.NotifyUrgentCaseAsync(readModel.HubId, dto, cancellationToken);
        await SendUrgentEmailAsync(scope, db, guest, readModel, cancellationToken);
    }

    /// <summary>
    /// Emails the assigned worker that their guest has been escalated. Entirely best-effort:
    /// the read model and SignalR push have already happened, and a mail failure must not
    /// retry or undo them.
    /// </summary>
    private async Task SendUrgentEmailAsync(
        IServiceScope scope, EmhipDbContext db, Domain.Entities.Guest guest,
        UrgentCaseReadModel readModel, CancellationToken cancellationToken)
    {
        try
        {
            var settings = scope.ServiceProvider.GetRequiredService<IAppSettingsService>();
            if (!await settings.GetBoolAsync(SettingsCatalog.Keys.NotifyUrgentCase, true, cancellationToken)) return;
            if (guest.AssignedCmhwId is null) return;

            var recipient = await db.Users.AsNoTracking()
                .Where(u => u.Id == guest.AssignedCmhwId && u.IsActive)
                .Select(u => new { u.Email, u.DisplayName })
                .FirstOrDefaultAsync(cancellationToken);

            if (recipient?.Email is null) return;

            var flags = new List<string>();
            if (readModel.SuicidalIdeation) flags.Add("Suicidal ideation");
            if (readModel.SelfHarm) flags.Add("Self-harm");
            if (readModel.RiskToOthers) flags.Add("Risk to others");
            if (readModel.SevereDeterioration) flags.Add("Severe deterioration");
            if (readModel.SafeguardingConcern) flags.Add("Safeguarding concern");

            var portalUrl = scope.ServiceProvider.GetRequiredService<IConfiguration>()["Frontend:BaseUrl"] ?? string.Empty;
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

            await emailService.SendTemplateAsync(
                EmailTemplateCatalog.Keys.UrgentCaseRaised,
                recipient.Email,
                new Dictionary<string, string?>
                {
                    ["recipientName"] = recipient.DisplayName,
                    ["guestName"] = readModel.GuestName,
                    ["guestReference"] = $"G-{guest.GuestNumber}",
                    ["riskFlags"] = flags.Count > 0 ? string.Join(", ", flags) : "Risk flag raised",
                    ["raisedAt"] = readModel.EscalatedAt.ToString("dd MMM yyyy HH:mm"),
                    ["guestUrl"] = $"{portalUrl}/guests/{guest.Id}",
                    ["responseHours"] = (await settings.GetIntAsync(SettingsCatalog.Keys.UrgentResponseHours, 72, cancellationToken)).ToString(),
                },
                recipient.DisplayName,
                cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Urgent-case email failed for guest {GuestId}", guest.Id);
        }
    }

    private async Task HandleResolvedAsync(UrgentCaseResolvedEvent evt, CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EmhipDbContext>();
        var notifier = scope.ServiceProvider.GetRequiredService<IUrgentCaseNotifier>();

        var readModel = await db.UrgentCases.FirstOrDefaultAsync(u => u.GuestId == evt.GuestId, cancellationToken);
        if (readModel is null || !readModel.IsActive) return;

        readModel.IsActive = false;
        await db.SaveChangesAsync(cancellationToken);

        await notifier.NotifyUrgentCaseResolvedAsync(readModel.HubId, evt.GuestId, cancellationToken);
    }
}
