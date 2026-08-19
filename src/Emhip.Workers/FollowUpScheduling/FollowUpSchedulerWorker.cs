using Emhip.Application.Abstractions;
using Emhip.Application.Emails;
using Emhip.Application.Settings;
using Emhip.Domain.Enums;
using Emhip.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
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
            await NotifyAssigneesAsync(scope, db, today, cancellationToken);
        }
    }

    /// <summary>
    /// One digest per assignee listing everything of theirs that is overdue. Only sent when
    /// something newly tipped over in this sweep, so a standing backlog doesn't re-mail people
    /// every 15 minutes. Best-effort — mail failures never block the status update.
    /// </summary>
    private async Task NotifyAssigneesAsync(IServiceScope scope, EmhipDbContext db, DateOnly today, CancellationToken cancellationToken)
    {
        try
        {
            var settings = scope.ServiceProvider.GetRequiredService<IAppSettingsService>();
            if (!await settings.GetBoolAsync(SettingsCatalog.Keys.NotifyOverdueFollowUps, true, cancellationToken)) return;

            var overdue = await db.FollowUps.AsNoTracking()
                .Where(f => f.Status == FollowUpStatus.Overdue)
                .Join(db.Guests.AsNoTracking(), f => f.GuestId, g => g.Id, (f, g) => new
                {
                    f.AssigneeStaffId,
                    f.DueDate,
                    GuestName = g.FirstName + " " + g.LastName,
                    g.GuestNumber,
                })
                .ToListAsync(cancellationToken);

            if (overdue.Count == 0) return;

            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
            var portalUrl = scope.ServiceProvider.GetRequiredService<IConfiguration>()["Frontend:BaseUrl"] ?? string.Empty;

            foreach (var group in overdue.GroupBy(o => o.AssigneeStaffId))
            {
                var recipient = await db.Users.AsNoTracking()
                    .Where(u => u.Id == group.Key && u.IsActive)
                    .Select(u => new { u.Email, u.DisplayName })
                    .FirstOrDefaultAsync(cancellationToken);

                if (recipient?.Email is null) continue;

                var items = group.OrderBy(o => o.DueDate).Take(20)
                    .Select(o => $"<li>{System.Net.WebUtility.HtmlEncode(o.GuestName)} (G-{o.GuestNumber}) — due {o.DueDate:dd MMM yyyy}</li>");

                await emailService.SendTemplateAsync(
                    EmailTemplateCatalog.Keys.FollowUpOverdue,
                    recipient.Email,
                    new Dictionary<string, string?>
                    {
                        ["recipientName"] = recipient.DisplayName,
                        ["overdueCount"] = group.Count().ToString(),
                        ["followUpList"] = $"<ul>{string.Join(string.Empty, items)}</ul>",
                        ["portalUrl"] = portalUrl,
                    },
                    recipient.DisplayName,
                    cancellationToken);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Overdue follow-up notifications failed");
        }
    }
}
