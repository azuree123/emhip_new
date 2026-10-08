using Emhip.Application.UrgentCases;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using Emhip.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Infrastructure.Reads;

/// <summary>
/// Active queue reads come straight from the UrgentCases_ReadModel table maintained by
/// EscalationWorker — no joins at request time. The Urgent Case Record is the exception: it is a
/// one-case composition over the write tables (episode, the risk assessments that raised it,
/// contacts and their casework notes), read rarely enough that a handful of indexed queries is
/// the right trade-off against another projection table.
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
                u.SafeguardingConcern, u.AssignedCmhwName, u.EscalatedAt, u.OtherRisk, u.OtherRiskDetails))
            .ToListAsync(cancellationToken);

    public async Task<UrgentEpisodeDto?> GetOpenEpisodeAsync(Guid guestId, CancellationToken cancellationToken = default) =>
        await ProjectEpisodes(db.UrgentEpisodes.AsNoTracking().Where(e => e.GuestId == guestId && e.ResolvedAt == null).OrderByDescending(e => e.RaisedAt))
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<UrgentEpisodeDto>> GetResolvedEpisodesAsync(Guid hubId, CancellationToken cancellationToken = default) =>
        await ProjectEpisodes(db.UrgentEpisodes.AsNoTracking()
                .Where(e => e.ResolvedAt != null && db.Guests.Any(g => g.Id == e.GuestId && g.HubId == hubId))
                .OrderByDescending(e => e.ResolvedAt)
                .Take(100))
            .ToListAsync(cancellationToken);

    private IQueryable<UrgentEpisodeDto> ProjectEpisodes(IQueryable<UrgentEpisode> episodes) =>
        episodes.Select(e => new UrgentEpisodeDto(
            e.Id, e.GuestId,
            db.Guests.Where(g => g.Id == e.GuestId).Select(g => g.FirstName + " " + g.LastName).FirstOrDefault() ?? "Unknown",
            db.Guests.Where(g => g.Id == e.GuestId).Select(g => g.GuestNumber).FirstOrDefault(),
            e.RaisedAt,
            e.CmhtNotified, e.CmhtTeam,
            e.ResolvedAt,
            db.Users.Where(u => u.Id == e.ResolvedByStaffId).Select(u => u.DisplayName).FirstOrDefault(),
            e.ResolutionNote, e.ExternalServicesInvolved, e.InpatientAdmission));

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

    public async Task<IReadOnlyList<UrgentCaseHistoryRowDto>> GetCaseHistoryForGuestAsync(
        Guid hubId, Guid guestId, int responseHours, CancellationToken cancellationToken = default)
    {
        var inHub = await db.Guests.AsNoTracking().AnyAsync(g => g.Id == guestId && g.HubId == hubId, cancellationToken);
        if (!inHub) return [];

        var episodes = await db.UrgentEpisodes.AsNoTracking()
            .Where(e => e.GuestId == guestId)
            .OrderBy(e => e.RaisedAt)
            .ToListAsync(cancellationToken);
        if (episodes.Count == 0) return [];

        // A guest has a handful of flagged assessments at most, so they are matched in memory: the
        // one that raised the case, else (older cases) the latest flagged one up to the raise.
        var risks = await db.RiskAssessments.AsNoTracking()
            .Where(r => r.GuestId == guestId
                && (r.SuicidalIdeation || r.SelfHarm || r.RiskToOthers || r.SevereDeterioration || r.SafeguardingConcern || r.OtherRisk))
            .OrderBy(r => r.AssessedAt)
            .ToListAsync(cancellationToken);

        var staffIds = episodes
            .SelectMany(e => new[] { e.RaisedByStaffId, e.ResolvedByStaffId })
            .Concat(risks.Select(r => (Guid?)r.AssessedByStaffId))
            .Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToList();
        var names = await db.Users.AsNoTracking()
            .Where(u => staffIds.Contains(u.Id))
            .Select(u => new { u.Id, u.DisplayName })
            .ToDictionaryAsync(u => u.Id, u => u.DisplayName, cancellationToken);
        string? Name(Guid? id) => id is not null && names.TryGetValue(id.Value, out var n) ? n : null;

        return episodes
            .Select((e, i) =>
            {
                var intake = risks.FirstOrDefault(r => r.Id == e.RiskAssessmentId)
                    ?? risks.LastOrDefault(r => r.AssessedAt <= e.RaisedAt.AddMinutes(1));
                return new UrgentCaseHistoryRowDto(
                    e.Id, i + 1, e.RaisedAt, Name(e.RaisedByStaffId) ?? Name(intake?.AssessedByStaffId),
                    intake is null ? [] : RiskFlagLabels(intake),
                    e.DeadlineAt(responseHours), e.IsResolved, e.ResolvedAt, Name(e.ResolvedByStaffId),
                    e.ResolvedWithinWindow(responseHours), e.CmhtNotified, e.InpatientAdmission, e.ResolutionNote);
            })
            .OrderByDescending(r => r.RaisedAt)
            .ToList();
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

        // ---- The risk assessment that raised the case ("Risk identified" + "Urgent case notes") ----
        var intake = episode.RiskAssessmentId is not null
            ? await db.RiskAssessments.AsNoTracking().FirstOrDefaultAsync(r => r.Id == episode.RiskAssessmentId, cancellationToken)
            : null;
        intake ??= await db.RiskAssessments.AsNoTracking()
            .Where(r => r.GuestId == guest.Id && r.AssessedAt <= windowEnd)
            .OrderByDescending(r => r.AssessedAt)
            .FirstOrDefaultAsync(cancellationToken);

        // Raising again while the case is open adds a risk assessment to the same case. The
        // initial conversation's automatic assessment is left out once registration's fuller
        // one has replaced it as the opening record.
        Guid? intakeId = intake?.Id;
        const string automaticNote = Emhip.Application.Guests.Commands.RecordInitialConversationCommandHandler.ImmediateRiskNote;
        var furtherRisks = await db.RiskAssessments.AsNoTracking()
            .Where(r => r.GuestId == guest.Id && r.AssessedAt >= windowStart && r.AssessedAt <= windowEnd
                && r.Id != intakeId
                && !(r.Notes != null && r.Notes.StartsWith(automaticNote))
                && (r.SuicidalIdeation || r.SelfHarm || r.RiskToOthers || r.SevereDeterioration || r.SafeguardingConcern || r.OtherRisk))
            .OrderBy(r => r.AssessedAt)
            .ToListAsync(cancellationToken);

        // Older cases did not snapshot the pathway; reconstruct it from the pathway history.
        GuestPathway? pathwayAtFlag = episode.PathwayAtFlag;
        if (pathwayAtFlag is null)
        {
            var changes = await db.PathwayChanges.AsNoTracking()
                .Where(p => p.GuestId == guest.Id)
                .OrderBy(p => p.CreatedAt)
                .Select(p => new { p.FromPathway, p.ToPathway, p.CreatedAt })
                .ToListAsync(cancellationToken);
            var before = changes.LastOrDefault(p => p.CreatedAt <= episode.RaisedAt);
            var after = changes.FirstOrDefault(p => p.CreatedAt > episode.RaisedAt);
            pathwayAtFlag = before?.ToPathway ?? after?.FromPathway ?? guest.Pathway;
        }

        // ---- "Contacts logged since flag", with the contact type the worker chose on Add Contact ----
        var contacts = await db.Contacts.AsNoTracking()
            .Where(c => c.GuestId == guest.Id && c.OccurredAt >= windowStart && c.OccurredAt <= windowEnd)
            .OrderBy(c => c.OccurredAt)
            .Select(c => new
            {
                c.Id, c.Type, c.OccurredAt,
                Author = db.Users.Where(u => u.Id == c.CreatedByStaffId).Select(u => u.DisplayName).FirstOrDefault(),
                Category = db.CaseworkNotes.Where(n => n.ContactId == c.Id).Select(n => n.Category).FirstOrDefault(),
                IsCpn = db.CaseworkNotes.Any(n => n.ContactId == c.Id && n.IsCpnContact),
            })
            .ToListAsync(cancellationToken);

        // ---- Staff names in one round trip ----
        var staffIds = new[]
            {
                episode.RaisedByStaffId, episode.CmhtRecordedByStaffId, episode.ResolvedByStaffId,
                episode.AssignedCmhwIdAtFlag, guest.AssignedCmhwId, intake?.AssessedByStaffId,
            }
            .Concat(furtherRisks.Select(r => (Guid?)r.AssessedByStaffId))
            .Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToList();
        var names = await db.Users.AsNoTracking()
            .Where(u => staffIds.Contains(u.Id))
            .Select(u => new { u.Id, u.DisplayName })
            .ToDictionaryAsync(u => u.Id, u => u.DisplayName, cancellationToken);
        string? Name(Guid? id) => id is not null && names.TryGetValue(id.Value, out var n) ? n : null;

        var raisedByName = Name(episode.RaisedByStaffId) ?? Name(intake?.AssessedByStaffId);
        var assignedCmhwName = Name(episode.AssignedCmhwIdAtFlag) ?? Name(guest.AssignedCmhwId);
        var flags = intake is null ? [] : RiskFlagLabels(intake);

        var cmht = episode.CmhtNotified is { } notified
            ? new UrgentCaseCmhtContactDto(
                notified, episode.CmhtTeam, episode.CmhtContactName, episode.CmhtCalledAt, episode.CmhtCallNotes,
                Name(episode.CmhtRecordedByStaffId), episode.CmhtRecordedAt)
            : null;

        var contactRows = contacts
            .Select(c => new UrgentCaseContactDto(c.Id, c.OccurredAt, c.Category?.ToString(), c.IsCpn, Pretty(c.Type.ToString()), c.Author))
            .ToList();

        // ---- System audit trail: flag raised, contacts logged, CMHT notified, case resolved (oldest first) ----
        var audit = new List<UrgentCaseAuditEntryDto>
        {
            new("raised", "Urgent case raised", raisedByName, episode.RaisedAt, flags.Count > 0 ? string.Join(", ", flags) : null),
        };
        audit.AddRange(furtherRisks.Select(r => new UrgentCaseAuditEntryDto(
            "risk", "Further risk recorded", Name(r.AssessedByStaffId), r.AssessedAt,
            string.Join(" — ", new[] { string.Join(", ", RiskFlagLabels(r)), r.Notes }.Where(v => !string.IsNullOrWhiteSpace(v))))));
        audit.AddRange(contactRows.Select(c => new UrgentCaseAuditEntryDto(
            "contact", "Contact logged", c.RecordedByName, c.OccurredAt, $"{UrgentEpisodeRecordText.ContactLabel(c)} · {c.Method}")));
        if (cmht is not null && episode.CmhtRecordedAt is { } recordedAt)
        {
            audit.Add(cmht.Notified
                ? new("cmht", "CMHT notified", cmht.CalledByName, recordedAt,
                    string.Join(" · ", new[]
                    {
                        cmht.ContactName is null ? null : $"Spoke to {cmht.ContactName}",
                        cmht.Team,
                        cmht.CalledAt is null ? null : $"call {cmht.CalledAt:dd MMM yyyy HH:mm}",
                    }.Where(v => v is not null)))
                : new("cmht", "CMHT not notified", cmht.CalledByName, recordedAt, null));
        }
        if (episode.ResolvedAt is { } resolvedAt)
        {
            audit.Add(new("resolved", "Urgent case resolved", Name(episode.ResolvedByStaffId), resolvedAt, null));
        }
        audit = audit.OrderBy(a => a.OccurredAt).ToList();

        return new UrgentEpisodeRecordDto(
            episode.Id, guest.Id, guest.Name, guest.GuestNumber, episodeNumber, allEpisodes, responseHours,
            assignedCmhwName, pathwayAtFlag,
            episode.RaisedAt, episode.DeadlineAt(responseHours), episode.IsResolved,
            raisedByName, flags, intake?.Notes,
            cmht, contactRows,
            episode.ResolvedAt, Name(episode.ResolvedByStaffId), episode.ResolvedWithinWindow(responseHours),
            episode.InpatientAdmission, episode.ExternalServicesInvolved, episode.ResolutionNote,
            audit);
    }

    private static List<string> RiskFlagLabels(RiskAssessment r)
    {
        // Same labels as the Raise Urgent Case form and the Urgent Cases list.
        var list = new List<string>(6);
        if (r.SuicidalIdeation) list.Add("Suicidal Ideation");
        if (r.SelfHarm) list.Add("Self Harm");
        if (r.RiskToOthers) list.Add("Risk to Others");
        if (r.SevereDeterioration) list.Add("Severe Deterioration");
        if (r.SafeguardingConcern) list.Add("Safeguarding Concern");
        if (r.OtherRisk) list.Add(string.IsNullOrWhiteSpace(r.OtherRiskDetails) ? "Other" : $"Other: {r.OtherRiskDetails}");
        return list;
    }

    /// <summary>"PhoneCall" → "Phone call".</summary>
    private static string Pretty(string value)
    {
        var spaced = System.Text.RegularExpressions.Regex.Replace(value, "([a-z])([A-Z])", "$1 $2");
        return spaced.Length > 1 ? spaced[0] + spaced[1..].ToLowerInvariant() : spaced;
    }

}
