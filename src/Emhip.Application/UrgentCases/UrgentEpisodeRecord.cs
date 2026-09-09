using System.Text;
using Emhip.Application.Abstractions;
using Emhip.Application.Settings;
using Emhip.Domain.Enums;
using MediatR;

namespace Emhip.Application.UrgentCases;

/// <summary>One tab on the Urgent Episode Record screen ("Episode 1", "Episode 2", …).</summary>
public sealed record UrgentEpisodeSummaryDto(Guid Id, int EpisodeNumber, DateTimeOffset RaisedAt, DateTimeOffset? ResolvedAt);

/// <summary>"Crisis action notes at intake" — the risk assessment that opened the episode.</summary>
public sealed record UrgentEpisodeIntakeDto(
    Guid? RiskAssessmentId, IReadOnlyList<string> RiskFlags, string? Notes, DateTimeOffset? AssessedAt, string? AssessedByName);

/// <summary>An entry in the "Full episode timeline". Kind: flag | note | escalation | contact | followup | pathway | resolved.</summary>
public sealed record UrgentEpisodeTimelineEntryDto(
    string Kind, string Title, string? Description, string? SecondaryDescription, DateTimeOffset OccurredAt, string? ActorName);

/// <summary>"System audit trail" line. Tone: red | blue | green | grey (the coloured dot in the design).</summary>
public sealed record UrgentEpisodeAuditEntryDto(string Tone, string Title, string Detail, DateTimeOffset OccurredAt);

/// <summary>Everything the Urgent Episode Record screen shows for one episode (design Desktop57).</summary>
public sealed record UrgentEpisodeRecordDto(
    Guid Id,
    Guid GuestId,
    string GuestName,
    int GuestNumber,
    int EpisodeNumber,
    IReadOnlyList<UrgentEpisodeSummaryDto> Episodes,
    int ResponseHours,
    // Episode overview
    DateTimeOffset RaisedAt,
    DateTimeOffset DeadlineAt,
    string? RaisedByName,
    GuestPathway? PathwayAtFlag,
    string? AssignedCmhwName,
    DateTimeOffset? EscalatedToCmhtAt,
    string? EscalatedToCmhtByName,
    string? CmhtTeam,
    string? EscalationReason,
    string? EscalationUrgency,
    string? EscalationNotes,
    // Resolution
    bool IsResolved,
    DateTimeOffset? ResolvedAt,
    string? ResolvedByName,
    bool? ResolvedWithinWindow,
    string? ResolutionNote,
    // Pathway re-entry decision
    GuestPathway? PathwayAfterResolution,
    string? CmhwAfterResolutionName,
    DateOnly? NextContactDate,
    string? SessionFrequencyChange,
    bool InpatientAdmission,
    // Episode outcome
    int FollowUpsLogged,
    long DurationMinutes,
    int RecordAccessCount,
    UrgentEpisodeIntakeDto Intake,
    IReadOnlyList<UrgentEpisodeTimelineEntryDto> Timeline,
    IReadOnlyList<UrgentEpisodeAuditEntryDto> AuditTrail);

/// <summary>Every episode for the guest, oldest first — the tab strip on the record screen.</summary>
public sealed record GetGuestUrgentEpisodesQuery(Guid HubId, Guid GuestId) : IRequest<IReadOnlyList<UrgentEpisodeSummaryDto>>;

public sealed class GetGuestUrgentEpisodesQueryHandler(IUrgentCaseReadService reads)
    : IRequestHandler<GetGuestUrgentEpisodesQuery, IReadOnlyList<UrgentEpisodeSummaryDto>>
{
    public Task<IReadOnlyList<UrgentEpisodeSummaryDto>> Handle(GetGuestUrgentEpisodesQuery request, CancellationToken cancellationToken) =>
        reads.GetEpisodesForGuestAsync(request.HubId, request.GuestId, cancellationToken);
}

/// <summary>
/// The full record for one episode. Viewing it is a clinical-data read that is not under
/// /guests/{id}, so the handler writes the access-log entry itself (UK GDPR accountability).
/// </summary>
public sealed record GetUrgentEpisodeRecordQuery(Guid HubId, Guid EpisodeId) : IRequest<UrgentEpisodeRecordDto?>;

public sealed class GetUrgentEpisodeRecordQueryHandler(IUrgentCaseReadService reads, IAppSettingsService settings, IAuditTrail audit)
    : IRequestHandler<GetUrgentEpisodeRecordQuery, UrgentEpisodeRecordDto?>
{
    public async Task<UrgentEpisodeRecordDto?> Handle(GetUrgentEpisodeRecordQuery request, CancellationToken cancellationToken)
    {
        var responseHours = await settings.GetIntAsync(SettingsCatalog.Keys.UrgentResponseHours, 72, cancellationToken);
        var record = await reads.GetEpisodeRecordAsync(request.HubId, request.EpisodeId, Math.Max(1, responseHours), cancellationToken);
        if (record is not null)
        {
            await audit.RecordAsync(record.GuestId, AuditAction.Read, "UrgentEpisode", record.Id.ToString(), "Urgent episode record viewed", cancellationToken);
        }
        return record;
    }
}

/// <summary>"Export Record" — a plain-text copy of the episode record. Logged as an export against the guest.</summary>
public sealed record ExportUrgentEpisodeRecordQuery(Guid HubId, Guid EpisodeId) : IRequest<UrgentEpisodeExportDto?>;

public sealed record UrgentEpisodeExportDto(string FileName, string Content);

public sealed class ExportUrgentEpisodeRecordQueryHandler(IUrgentCaseReadService reads, IAppSettingsService settings, IAuditTrail audit)
    : IRequestHandler<ExportUrgentEpisodeRecordQuery, UrgentEpisodeExportDto?>
{
    public async Task<UrgentEpisodeExportDto?> Handle(ExportUrgentEpisodeRecordQuery request, CancellationToken cancellationToken)
    {
        var responseHours = await settings.GetIntAsync(SettingsCatalog.Keys.UrgentResponseHours, 72, cancellationToken);
        var record = await reads.GetEpisodeRecordAsync(request.HubId, request.EpisodeId, Math.Max(1, responseHours), cancellationToken);
        if (record is null) return null;

        await audit.RecordAsync(record.GuestId, AuditAction.Read, "UrgentEpisode", record.Id.ToString(), "Urgent episode record exported", cancellationToken);

        return new UrgentEpisodeExportDto(
            $"urgent-episode-G-{record.GuestNumber}-episode-{record.EpisodeNumber}.txt",
            UrgentEpisodeRecordText.Build(record));
    }
}

/// <summary>Renders the record as the plain-text document behind "Export Record".</summary>
public static class UrgentEpisodeRecordText
{
    public static string Build(UrgentEpisodeRecordDto r)
    {
        var sb = new StringBuilder();
        string When(DateTimeOffset? d) => d is null ? "—" : d.Value.ToString("dd MMM yyyy · HH:mm");
        string YesNo(bool b) => b ? "YES" : "NO";
        string Pathway(GuestPathway? p) => p switch
        {
            GuestPathway.MentalWellbeing => "Wellbeing support",
            GuestPathway.ClinicalSupport => "Clinical support",
            GuestPathway.CommunityRecovery => "Community recovery",
            _ => "Not allocated",
        };

        sb.AppendLine("URGENT EPISODE RECORD");
        sb.AppendLine($"{(r.IsResolved ? "Resolved" : "Open")} · {When(r.ResolvedAt ?? r.RaisedAt)}");
        sb.AppendLine($"Guest: {r.GuestName} (G-{r.GuestNumber}) · Episode {r.EpisodeNumber} of {r.Episodes.Count}");
        sb.AppendLine($"Exported: {DateTimeOffset.UtcNow:dd MMM yyyy · HH:mm} UTC");
        sb.AppendLine();
        sb.AppendLine("EPISODE OVERVIEW");
        sb.AppendLine($"  Pathway at time of flag:   {Pathway(r.PathwayAtFlag)}");
        sb.AppendLine($"  Assigned CMHW:             {r.AssignedCmhwName ?? "Unassigned"}");
        sb.AppendLine($"  Flag raised by:            {r.RaisedByName ?? "—"}");
        sb.AppendLine($"  Flag raised at:            {When(r.RaisedAt)}");
        sb.AppendLine($"  {r.ResponseHours}-hour deadline:          {When(r.DeadlineAt)}");
        sb.AppendLine($"  Resolved at:               {When(r.ResolvedAt)}");
        sb.AppendLine($"  Resolved by:               {r.ResolvedByName ?? "—"}");
        sb.AppendLine($"  Resolved within window:    {(r.ResolvedWithinWindow is null ? "—" : YesNo(r.ResolvedWithinWindow.Value))}");
        sb.AppendLine($"  External service involved: {r.CmhtTeam ?? "None"}");
        sb.AppendLine();
        sb.AppendLine("CRISIS ACTION NOTES AT INTAKE");
        sb.AppendLine($"  Risk flags: {(r.Intake.RiskFlags.Count == 0 ? "—" : string.Join(", ", r.Intake.RiskFlags))}");
        sb.AppendLine($"  {r.Intake.Notes ?? "No intake notes recorded."}");
        sb.AppendLine();
        sb.AppendLine("FULL EPISODE TIMELINE");
        foreach (var t in r.Timeline)
        {
            sb.AppendLine($"  [{When(t.OccurredAt)}] {t.Title}{(t.ActorName is null ? "" : $" — {t.ActorName}")}");
            if (!string.IsNullOrWhiteSpace(t.Description)) sb.AppendLine($"      {t.Description}");
            if (!string.IsNullOrWhiteSpace(t.SecondaryDescription)) sb.AppendLine($"      {t.SecondaryDescription}");
        }
        sb.AppendLine();
        sb.AppendLine("RESOLUTION NOTE");
        sb.AppendLine($"  {r.ResolutionNote ?? (r.IsResolved ? "Resolution note not recorded." : "Episode still open.")}");
        sb.AppendLine();
        sb.AppendLine("PATHWAY RE-ENTRY DECISION");
        sb.AppendLine($"  Pathway before crisis:     {Pathway(r.PathwayAtFlag)}");
        sb.AppendLine($"  Pathway after resolution:  {(r.IsResolved ? Pathway(r.PathwayAfterResolution) : "—")}");
        sb.AppendLine($"  CMHW after resolution:     {r.CmhwAfterResolutionName ?? "—"}");
        sb.AppendLine($"  Next contact set:          {(r.NextContactDate is null ? "—" : r.NextContactDate.Value.ToString("dd MMM yyyy"))}");
        sb.AppendLine($"  Session frequency changed: {r.SessionFrequencyChange ?? "No"}");
        sb.AppendLine();
        sb.AppendLine("EPISODE OUTCOME");
        sb.AppendLine($"  Status:                    {(r.IsResolved ? "Resolved" : "Open")}");
        sb.AppendLine($"  Within {r.ResponseHours} hours:           {(r.ResolvedWithinWindow is null ? "Pending" : YesNo(r.ResolvedWithinWindow.Value))}");
        sb.AppendLine($"  Duration:                  {Duration(r.DurationMinutes)}");
        sb.AppendLine($"  Follow-ups logged:         {r.FollowUpsLogged}");
        sb.AppendLine($"  Escalation to CMHT:        {YesNo(r.EscalatedToCmhtAt is not null)}");
        sb.AppendLine($"  Inpatient admission:       {YesNo(r.InpatientAdmission)}");
        sb.AppendLine();
        sb.AppendLine("SYSTEM AUDIT TRAIL");
        foreach (var a in r.AuditTrail) sb.AppendLine($"  {a.Title} — {a.Detail}");
        return sb.ToString();
    }

    public static string Duration(long minutes)
    {
        var days = minutes / (60 * 24);
        var hours = (minutes % (60 * 24)) / 60;
        var mins = minutes % 60;
        return days > 0 ? $"{days}d {hours}h" : hours > 0 ? $"{hours}h {mins}m" : $"{mins}m";
    }
}
