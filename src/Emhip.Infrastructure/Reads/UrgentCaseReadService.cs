using Emhip.Application.UrgentCases;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using Emhip.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Infrastructure.Reads;

/// <summary>
/// Active queue reads come straight from the UrgentCases_ReadModel table maintained by
/// EscalationWorker — no joins at request time. The episode record is the exception: it is a
/// one-episode composition over the write tables (episode, intake risk assessment, contacts,
/// crisis notes, follow-ups, pathway changes and the audit log), read rarely enough that a
/// handful of indexed queries is the right trade-off against another projection table.
/// </summary>
public sealed class UrgentCaseReadService(EmhipDbContext db) : IUrgentCaseReadService
{
    public async Task<IReadOnlyList<UrgentCaseDto>> GetActiveUrgentCasesAsync(Guid hubId, CancellationToken cancellationToken = default) =>
        await db.UrgentCases.AsNoTracking()
            .Where(u => u.HubId == hubId && u.IsActive)
            .OrderByDescending(u => u.EscalatedAt)
            .Select(u => new UrgentCaseDto(
                u.GuestId, u.GuestName,
                db.Guests.Where(g => g.Id == u.GuestId).Select(g => g.GuestNumber).FirstOrDefault(),
                u.SuicidalIdeation, u.SelfHarm, u.RiskToOthers, u.SevereDeterioration,
                u.SafeguardingConcern, u.AssignedCmhwName, u.EscalatedAt))
            .ToListAsync(cancellationToken);

    public async Task<UrgentEpisodeDto?> GetOpenEpisodeAsync(Guid guestId, CancellationToken cancellationToken = default) =>
        await db.UrgentEpisodes.AsNoTracking()
            .Where(e => e.GuestId == guestId && e.ResolvedAt == null)
            .OrderByDescending(e => e.RaisedAt)
            .Select(e => new UrgentEpisodeDto(
                e.Id, e.GuestId,
                db.Guests.Where(g => g.Id == e.GuestId).Select(g => g.FirstName + " " + g.LastName).FirstOrDefault() ?? "Unknown",
                db.Guests.Where(g => g.Id == e.GuestId).Select(g => g.GuestNumber).FirstOrDefault(),
                e.RaisedAt,
                e.EscalatedToCmhtAt,
                db.Users.Where(u => u.Id == e.EscalatedToCmhtByStaffId).Select(u => u.DisplayName).FirstOrDefault(),
                e.CmhtTeam, e.EscalationReason, e.EscalationUrgency, e.EscalationNotes,
                e.ResolvedAt,
                db.Users.Where(u => u.Id == e.ResolvedByStaffId).Select(u => u.DisplayName).FirstOrDefault(),
                e.ResolutionNote))
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<UrgentEpisodeDto>> GetResolvedEpisodesAsync(Guid hubId, CancellationToken cancellationToken = default) =>
        await db.UrgentEpisodes.AsNoTracking()
            .Where(e => e.ResolvedAt != null && db.Guests.Any(g => g.Id == e.GuestId && g.HubId == hubId))
            .OrderByDescending(e => e.ResolvedAt)
            .Take(100)
            .Select(e => new UrgentEpisodeDto(
                e.Id, e.GuestId,
                db.Guests.Where(g => g.Id == e.GuestId).Select(g => g.FirstName + " " + g.LastName).FirstOrDefault() ?? "Unknown",
                db.Guests.Where(g => g.Id == e.GuestId).Select(g => g.GuestNumber).FirstOrDefault(),
                e.RaisedAt,
                e.EscalatedToCmhtAt,
                db.Users.Where(u => u.Id == e.EscalatedToCmhtByStaffId).Select(u => u.DisplayName).FirstOrDefault(),
                e.CmhtTeam, e.EscalationReason, e.EscalationUrgency, e.EscalationNotes,
                e.ResolvedAt,
                db.Users.Where(u => u.Id == e.ResolvedByStaffId).Select(u => u.DisplayName).FirstOrDefault(),
                e.ResolutionNote))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<UrgentEpisodeSummaryDto>> GetEpisodesForGuestAsync(Guid hubId, Guid guestId, CancellationToken cancellationToken = default)
    {
        var inHub = await db.Guests.AsNoTracking().AnyAsync(g => g.Id == guestId && g.HubId == hubId, cancellationToken);
        if (!inHub) return [];

        var episodes = await db.UrgentEpisodes.AsNoTracking()
            .Where(e => e.GuestId == guestId)
            .OrderBy(e => e.RaisedAt)
            .Select(e => new { e.Id, e.RaisedAt, e.ResolvedAt })
            .ToListAsync(cancellationToken);

        return episodes.Select((e, i) => new UrgentEpisodeSummaryDto(e.Id, i + 1, e.RaisedAt, e.ResolvedAt)).ToList();
    }

    public async Task<UrgentEpisodeRecordDto?> GetEpisodeRecordAsync(Guid hubId, Guid episodeId, int responseHours, CancellationToken cancellationToken = default)
    {
        var episode = await db.UrgentEpisodes.AsNoTracking().FirstOrDefaultAsync(e => e.Id == episodeId, cancellationToken);
        if (episode is null) return null;

        var guest = await db.Guests.AsNoTracking()
            .Where(g => g.Id == episode.GuestId && g.HubId == hubId)
            .Select(g => new { g.Id, g.GuestNumber, Name = g.FirstName + " " + g.LastName, g.Pathway, g.AssignedCmhwId })
            .FirstOrDefaultAsync(cancellationToken);
        if (guest is null) return null;

        var allEpisodes = await GetEpisodesForGuestAsync(hubId, guest.Id, cancellationToken);
        var episodeNumber = allEpisodes.FirstOrDefault(e => e.Id == episodeId)?.EpisodeNumber ?? 1;

        var now = DateTimeOffset.UtcNow;
        var windowStart = episode.RaisedAt.AddMinutes(-1);
        var windowEnd = (episode.ResolvedAt ?? now).AddMinutes(1);

        // ---- Intake: the risk assessment that opened the episode ----
        var intake = episode.RiskAssessmentId is not null
            ? await db.RiskAssessments.AsNoTracking().FirstOrDefaultAsync(r => r.Id == episode.RiskAssessmentId, cancellationToken)
            : null;
        intake ??= await db.RiskAssessments.AsNoTracking()
            .Where(r => r.GuestId == guest.Id && r.AssessedAt <= windowEnd)
            .OrderByDescending(r => r.AssessedAt)
            .FirstOrDefaultAsync(cancellationToken);

        // ---- Pathway history, to reconstruct "pathway at flag / after resolution" for older episodes ----
        var pathwayChanges = await db.PathwayChanges.AsNoTracking()
            .Where(p => p.GuestId == guest.Id)
            .OrderBy(p => p.CreatedAt)
            .Select(p => new { p.FromPathway, p.ToPathway, p.Reason, p.CreatedAt, p.RecordedByStaffId })
            .ToListAsync(cancellationToken);

        GuestPathway? PathwayAt(DateTimeOffset at)
        {
            var before = pathwayChanges.LastOrDefault(p => p.CreatedAt <= at);
            if (before is not null) return before.ToPathway;
            var after = pathwayChanges.FirstOrDefault(p => p.CreatedAt > at);
            return after is not null ? after.FromPathway : guest.Pathway;
        }

        var pathwayAtFlag = episode.PathwayAtFlag ?? PathwayAt(episode.RaisedAt);
        var pathwayAfter = episode.IsResolved ? episode.PathwayAfterResolution ?? PathwayAt(episode.ResolvedAt!.Value) : null;

        // ---- Activity inside the window ----
        var contacts = await db.Contacts.AsNoTracking()
            .Where(c => c.GuestId == guest.Id && c.OccurredAt >= windowStart && c.OccurredAt <= windowEnd)
            .OrderBy(c => c.OccurredAt)
            .Select(c => new
            {
                c.Id, c.Type, c.Outcome, c.OccurredAt, c.Notes, c.CreatedAt,
                Author = db.Users.Where(u => u.Id == c.CreatedByStaffId).Select(u => u.DisplayName).FirstOrDefault(),
                Assessment = db.CaseworkNotes.Where(n => n.ContactId == c.Id).Select(n => n.Assessment).FirstOrDefault(),
                Recommendation = db.CaseworkNotes.Where(n => n.ContactId == c.Id).Select(n => n.Recommendation).FirstOrDefault(),
            })
            .ToListAsync(cancellationToken);

        var crisisNotes = await db.Notes.AsNoTracking()
            .Where(n => n.GuestId == guest.Id && n.IsPinned && n.CreatedAt >= windowStart && n.CreatedAt <= windowEnd)
            .OrderBy(n => n.CreatedAt)
            .Select(n => new { n.Body, n.CreatedAt, Author = db.Users.Where(u => u.Id == n.AuthorStaffId).Select(u => u.DisplayName).FirstOrDefault() })
            .ToListAsync(cancellationToken);

        var completedFollowUps = await db.FollowUps.AsNoTracking()
            .Where(f => f.GuestId == guest.Id && f.CompletedAt != null && f.CompletedAt >= windowStart && f.CompletedAt <= windowEnd)
            .OrderBy(f => f.CompletedAt)
            .Select(f => new { f.DueDate, f.Notes, f.CompletedAt, Assignee = db.Users.Where(u => u.Id == f.AssigneeStaffId).Select(u => u.DisplayName).FirstOrDefault() })
            .ToListAsync(cancellationToken);

        var accessCount = await db.AuditEvents.AsNoTracking()
            .CountAsync(a => a.GuestId == guest.Id && a.Action == AuditAction.Read && a.OccurredAt >= windowStart, cancellationToken);

        // ---- Staff names in one round trip ----
        var staffIds = new[]
            {
                episode.RaisedByStaffId, episode.EscalatedToCmhtByStaffId, episode.ResolvedByStaffId,
                episode.AssignedCmhwIdAtFlag, episode.CmhwAfterResolutionStaffId, guest.AssignedCmhwId,
                intake?.AssessedByStaffId,
            }
            .Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToList();
        var names = await db.Users.AsNoTracking()
            .Where(u => staffIds.Contains(u.Id))
            .Select(u => new { u.Id, u.DisplayName })
            .ToDictionaryAsync(u => u.Id, u => u.DisplayName, cancellationToken);
        string? Name(Guid? id) => id is not null && names.TryGetValue(id.Value, out var n) ? n : null;

        var raisedByName = Name(episode.RaisedByStaffId) ?? Name(intake?.AssessedByStaffId);
        var assignedCmhwName = Name(episode.AssignedCmhwIdAtFlag) ?? Name(guest.AssignedCmhwId);

        // ---- Timeline ----
        var flags = intake is null ? [] : RiskFlagLabels(intake);
        var timeline = new List<UrgentEpisodeTimelineEntryDto>
        {
            new("flag", "Urgent flag raised",
                flags.Count > 0
                    ? $"Risk identified — {string.Join(", ", flags)}. {responseHours}-hour contact window opened."
                    : $"{responseHours}-hour contact window opened.",
                intake?.Notes, episode.RaisedAt, raisedByName),
        };
        timeline.AddRange(crisisNotes.Select(n => new UrgentEpisodeTimelineEntryDto("note", "Crisis note added", n.Body, null, n.CreatedAt, n.Author)));
        if (episode.EscalatedToCmhtAt is { } escalatedAt)
        {
            timeline.Add(new("escalation", "Escalated to CMHT",
                $"{episode.CmhtTeam ?? "CMHT"}{(episode.EscalationReason is null ? "" : $" — {episode.EscalationReason}")}{(episode.EscalationUrgency is null ? "" : $" ({episode.EscalationUrgency})")}",
                episode.EscalationNotes, escalatedAt, Name(episode.EscalatedToCmhtByStaffId)));
        }
        timeline.AddRange(contacts.Select(c => new UrgentEpisodeTimelineEntryDto(
            "contact", "Contact logged",
            $"{Pretty(c.Type.ToString())} — {Pretty(c.Outcome.ToString())}",
            FirstNonBlank(c.Assessment, c.Notes, c.Recommendation), c.OccurredAt, c.Author)));
        timeline.AddRange(completedFollowUps.Select(f => new UrgentEpisodeTimelineEntryDto(
            "followup", "Scheduled contact completed", $"Due {f.DueDate:dd MMM yyyy}", f.Notes, f.CompletedAt!.Value, f.Assignee)));
        timeline.AddRange(pathwayChanges
            .Where(p => p.CreatedAt >= windowStart && p.CreatedAt <= windowEnd)
            .Select(p => new UrgentEpisodeTimelineEntryDto(
                "pathway", "Pathway changed", $"{PathwayLabel(p.FromPathway)} → {PathwayLabel(p.ToPathway)}", p.Reason, p.CreatedAt, Name(p.RecordedByStaffId))));
        if (episode.ResolvedAt is { } resolvedAt)
        {
            timeline.Add(new("resolved", "Episode resolved — flag closed",
                episode.ResolutionNote ?? "Resolution note not recorded.",
                pathwayAfter is null ? null : $"Guest continues on the {PathwayLabel(pathwayAfter)} pathway.",
                resolvedAt, Name(episode.ResolvedByStaffId)));
        }
        timeline = timeline.OrderBy(t => t.OccurredAt).ToList();

        // ---- System audit trail (newest first, as in the design) ----
        var audit = new List<UrgentEpisodeAuditEntryDto>();
        if (episode.ResolvedAt is { } ra)
        {
            audit.Add(new("green", "Episode resolved and locked", $"{ra:dd MMM yyyy · HH:mm}{Suffix(Name(episode.ResolvedByStaffId))}", ra));
        }
        if (contacts.Count > 0)
        {
            var first = contacts[0].OccurredAt;
            var last = contacts[^1].OccurredAt;
            audit.Add(new("blue", $"{contacts.Count} contact{(contacts.Count == 1 ? "" : "s")} logged",
                contacts.Count == 1 ? $"{first:dd MMM yyyy · HH:mm}{Suffix(contacts[0].Author)}" : $"{first:dd MMM · HH:mm} & {last:dd MMM · HH:mm}", last));
        }
        if (episode.EscalatedToCmhtAt is { } ea)
        {
            audit.Add(new("blue", "CMHT notified", $"{ea:dd MMM yyyy · HH:mm}{Suffix(Name(episode.EscalatedToCmhtByStaffId))}", ea));
        }
        if (accessCount > 0)
        {
            audit.Add(new("grey", $"Record accessed {accessCount} time{(accessCount == 1 ? "" : "s")}", "Every view is written to the access log", now));
        }
        audit.Add(new("red", "Urgent flag raised", $"{episode.RaisedAt:dd MMM yyyy · HH:mm}{Suffix(raisedByName)}", episode.RaisedAt));
        audit = audit.OrderByDescending(a => a.OccurredAt).ToList();

        var durationMinutes = (long)((episode.ResolvedAt ?? now) - episode.RaisedAt).TotalMinutes;

        return new UrgentEpisodeRecordDto(
            episode.Id, guest.Id, guest.Name, guest.GuestNumber, episodeNumber, allEpisodes, responseHours,
            episode.RaisedAt, episode.DeadlineAt(responseHours), raisedByName, pathwayAtFlag, assignedCmhwName,
            episode.EscalatedToCmhtAt, Name(episode.EscalatedToCmhtByStaffId), episode.CmhtTeam,
            episode.EscalationReason, episode.EscalationUrgency, episode.EscalationNotes,
            episode.IsResolved, episode.ResolvedAt, Name(episode.ResolvedByStaffId), episode.ResolvedWithinWindow(responseHours), episode.ResolutionNote,
            pathwayAfter, Name(episode.CmhwAfterResolutionStaffId), episode.NextContactDate, episode.SessionFrequencyChange, episode.InpatientAdmission,
            contacts.Count, Math.Max(0, durationMinutes), accessCount,
            new UrgentEpisodeIntakeDto(intake?.Id, flags, intake?.Notes, intake?.AssessedAt, Name(intake?.AssessedByStaffId)),
            timeline, audit);
    }

    private static List<string> RiskFlagLabels(RiskAssessment r)
    {
        var list = new List<string>(5);
        if (r.SuicidalIdeation) list.Add("Suicidal ideation");
        if (r.SelfHarm) list.Add("Self harm");
        if (r.RiskToOthers) list.Add("Risk to others");
        if (r.SevereDeterioration) list.Add("Severe deterioration");
        if (r.SafeguardingConcern) list.Add("Safeguarding concern");
        return list;
    }

    private static string PathwayLabel(GuestPathway? p) => Emhip.Application.Guests.GuestPathwayLabels.For(p);

    /// <summary>"PhoneCall" → "Phone call".</summary>
    private static string Pretty(string value)
    {
        var spaced = System.Text.RegularExpressions.Regex.Replace(value, "([a-z])([A-Z])", "$1 $2");
        return spaced.Length > 1 ? spaced[0] + spaced[1..].ToLowerInvariant() : spaced;
    }

    private static string? FirstNonBlank(params string?[] values) => values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));

    private static string Suffix(string? name) => string.IsNullOrWhiteSpace(name) ? string.Empty : $" · {name}";
}
