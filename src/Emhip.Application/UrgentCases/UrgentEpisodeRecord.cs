using System.Text;
using Emhip.Application.Abstractions;
using Emhip.Application.Settings;
using Emhip.Domain.Enums;
using MediatR;

namespace Emhip.Application.UrgentCases;

/// <summary>One tab on the Urgent Case Record screen ("Urgent Case 1", "Urgent Case 2", …).</summary>
public sealed record UrgentEpisodeSummaryDto(Guid Id, int EpisodeNumber, DateTimeOffset RaisedAt, DateTimeOffset? ResolvedAt);

/// <summary>"CMHT or other NHS team notified" — the staff member's own record of the call.</summary>
public sealed record UrgentCaseCmhtContactDto(
    bool Notified, string? Team, string? ContactName, DateTimeOffset? CalledAt, string? Notes,
    string? CalledByName, DateTimeOffset? RecordedAt);

/// <summary>A contact logged against the guest after the flag was raised (and before resolution).</summary>
public sealed record UrgentCaseContactDto(
    Guid Id, DateTimeOffset OccurredAt, string? Category, bool IsCpnContact, string Method, string? RecordedByName);

/// <summary>
/// "System audit trail" line: action, staff name, date and time.
/// Kind: raised | risk | contact | cmht | resolved (drives the coloured dot).
/// </summary>
public sealed record UrgentCaseAuditEntryDto(string Kind, string Action, string? StaffName, DateTimeOffset OccurredAt, string? Detail);

/// <summary>
/// Everything the Urgent Case Record screen shows for one urgent case, grouped as in the
/// customer's field specification (Oct 2026): header, status bar, flag details, actions taken,
/// resolution and the audit trail.
/// </summary>
public sealed record UrgentEpisodeRecordDto(
    Guid Id,
    Guid GuestId,
    string GuestName,
    int GuestNumber,
    int EpisodeNumber,
    IReadOnlyList<UrgentEpisodeSummaryDto> Episodes,
    int ResponseHours,
    // 1. Header
    string? AssignedCmhwName,
    GuestPathway? PathwayAtFlag,
    // 2. Status bar
    DateTimeOffset RaisedAt,
    DateTimeOffset DeadlineAt,
    bool IsResolved,
    // 3. Flag details
    string? RaisedByName,
    IReadOnlyList<string> RiskFlags,
    string? UrgentCaseNotes,
    // 4. Actions taken
    UrgentCaseCmhtContactDto? CmhtContact,
    IReadOnlyList<UrgentCaseContactDto> ContactsSinceFlag,
    // 5. Resolution
    DateTimeOffset? ResolvedAt,
    string? ResolvedByName,
    bool? ResolvedWithinWindow,
    bool InpatientAdmission,
    string? ExternalServicesInvolved,
    // Only set on cases resolved before the Oct 2026 spec, which no longer asks for one.
    string? ResolutionNote,
    // 7. System audit trail, oldest first
    IReadOnlyList<UrgentCaseAuditEntryDto> AuditTrail);

/// <summary>Every urgent case for the guest, oldest first — the tab strip on the record screen.</summary>
public sealed record GetGuestUrgentEpisodesQuery(Guid HubId, Guid GuestId) : IRequest<IReadOnlyList<UrgentEpisodeSummaryDto>>;

public sealed class GetGuestUrgentEpisodesQueryHandler(IUrgentCaseReadService reads)
    : IRequestHandler<GetGuestUrgentEpisodesQuery, IReadOnlyList<UrgentEpisodeSummaryDto>>
{
    public Task<IReadOnlyList<UrgentEpisodeSummaryDto>> Handle(GetGuestUrgentEpisodesQuery request, CancellationToken cancellationToken) =>
        reads.GetEpisodesForGuestAsync(request.HubId, request.GuestId, cancellationToken);
}

/// <summary>
/// One row of the guest's "Urgent Case History" tab — every urgent case, open and resolved, with
/// enough of the record to scan without opening it (the row opens the full Urgent Case Record).
/// </summary>
public sealed record UrgentCaseHistoryRowDto(
    Guid Id,
    int EpisodeNumber,
    DateTimeOffset RaisedAt,
    string? RaisedByName,
    IReadOnlyList<string> RiskFlags,
    DateTimeOffset DeadlineAt,
    bool IsResolved,
    DateTimeOffset? ResolvedAt,
    string? ResolvedByName,
    bool? ResolvedWithinWindow,
    bool? CmhtNotified,
    bool InpatientAdmission,
    string? ResolutionNote);

/// <summary>
/// The guest's urgent cases, newest first. Open to every role that can see urgent cases (CMHWs
/// included); like the record itself it is read outside /guests/{id}, so the view is logged here.
/// </summary>
public sealed record GetGuestUrgentCaseHistoryQuery(Guid HubId, Guid GuestId) : IRequest<IReadOnlyList<UrgentCaseHistoryRowDto>>;

public sealed class GetGuestUrgentCaseHistoryQueryHandler(IUrgentCaseReadService reads, IAppSettingsService settings, IAuditTrail audit)
    : IRequestHandler<GetGuestUrgentCaseHistoryQuery, IReadOnlyList<UrgentCaseHistoryRowDto>>
{
    public async Task<IReadOnlyList<UrgentCaseHistoryRowDto>> Handle(GetGuestUrgentCaseHistoryQuery request, CancellationToken cancellationToken)
    {
        var responseHours = await settings.GetIntAsync(SettingsCatalog.Keys.UrgentResponseHours, 72, cancellationToken);
        var rows = await reads.GetCaseHistoryForGuestAsync(request.HubId, request.GuestId, Math.Max(1, responseHours), cancellationToken);
        if (rows.Count > 0)
        {
            await audit.RecordAsync(request.GuestId, AuditAction.Read, "UrgentEpisode", request.GuestId.ToString(), "Urgent case history viewed", cancellationToken);
        }
        return rows;
    }
}

/// <summary>
/// The full record for one urgent case. Viewing it is a clinical-data read that is not under
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
            await audit.RecordAsync(record.GuestId, AuditAction.Read, "UrgentEpisode", record.Id.ToString(), "Urgent case record viewed", cancellationToken);
        }
        return record;
    }
}

/// <summary>"Export Record" — a plain-text copy of the Urgent Case Record. Logged as an export against the guest.</summary>
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

        await audit.RecordAsync(record.GuestId, AuditAction.Read, "UrgentEpisode", record.Id.ToString(), "Urgent case record exported", cancellationToken);

        return new UrgentEpisodeExportDto(
            $"urgent-case-G-{record.GuestNumber}-{record.EpisodeNumber}.txt",
            UrgentEpisodeRecordText.Build(record));
    }
}

/// <summary>Renders the record as the plain-text document behind "Export Record", section by section as on screen.</summary>
public static class UrgentEpisodeRecordText
{
    public static string Build(UrgentEpisodeRecordDto r)
    {
        var sb = new StringBuilder();
        string When(DateTimeOffset? d) => d is null ? "—" : d.Value.ToString("dd MMM yyyy · HH:mm");
        string YesNo(bool b) => b ? "Yes" : "No";
        void Row(string label, string? value) => sb.AppendLine($"  {label,-34}{(string.IsNullOrWhiteSpace(value) ? "—" : value)}");

        sb.AppendLine($"URGENT CASE RECORD — URGENT CASE {r.EpisodeNumber} OF {r.Episodes.Count}");
        sb.AppendLine($"Exported: {DateTimeOffset.UtcNow:dd MMM yyyy · HH:mm} UTC");
        sb.AppendLine();
        sb.AppendLine("GUEST");
        Row("Guest name", r.GuestName);
        Row("Reference ID", $"G-{r.GuestNumber}");
        Row("Assigned CMHW", r.AssignedCmhwName ?? "Unassigned");
        Row("Pathway at time of flag", Guests.GuestPathwayLabels.For(r.PathwayAtFlag));
        sb.AppendLine();
        sb.AppendLine("STATUS");
        Row("Case status", r.IsResolved ? "Resolved" : "Open");
        Row("Flag raised at", When(r.RaisedAt));
        Row($"{r.ResponseHours}-hour deadline", When(r.DeadlineAt));
        sb.AppendLine();
        sb.AppendLine("FLAG DETAILS");
        Row("Flag raised by", r.RaisedByName);
        Row("Flag raised at", When(r.RaisedAt));
        Row("Risk identified", r.RiskFlags.Count == 0 ? null : string.Join(", ", r.RiskFlags));
        sb.AppendLine("  Urgent case notes:");
        sb.AppendLine($"    {r.UrgentCaseNotes ?? "—"}");
        sb.AppendLine();
        sb.AppendLine("ACTIONS TAKEN");
        Row("CMHT or other NHS team notified", r.CmhtContact is null ? "Not recorded" : YesNo(r.CmhtContact.Notified));
        if (r.CmhtContact is { Notified: true } cmht)
        {
            Row("Team / service", cmht.Team);
            Row("Name of person called", cmht.ContactName);
            Row("Called by", cmht.CalledByName);
            Row("Date and time of call", When(cmht.CalledAt));
            Row("What was said", cmht.Notes);
        }
        Row("Contacts logged since flag", r.ContactsSinceFlag.Count.ToString());
        foreach (var c in r.ContactsSinceFlag)
        {
            sb.AppendLine($"    [{When(c.OccurredAt)}] {ContactLabel(c)} · {c.Method}{(c.RecordedByName is null ? "" : $" — {c.RecordedByName}")}");
        }
        sb.AppendLine();
        sb.AppendLine("RESOLUTION");
        Row("Resolved by", r.ResolvedByName);
        Row("Resolved at", When(r.ResolvedAt));
        Row($"Resolved within {r.ResponseHours}h", r.ResolvedWithinWindow is null ? "Pending" : YesNo(r.ResolvedWithinWindow.Value));
        Row("Inpatient admission", r.IsResolved ? YesNo(r.InpatientAdmission) : null);
        Row("Any other external service involved", r.IsResolved ? r.ExternalServicesInvolved ?? "None" : null);
        if (!string.IsNullOrWhiteSpace(r.ResolutionNote)) Row("Action taken to resolve", r.ResolutionNote);
        sb.AppendLine();
        sb.AppendLine("SYSTEM AUDIT TRAIL");
        foreach (var a in r.AuditTrail)
        {
            sb.AppendLine($"  [{When(a.OccurredAt)}] {a.Action}{(a.StaffName is null ? "" : $" — {a.StaffName}")}");
            if (!string.IsNullOrWhiteSpace(a.Detail)) sb.AppendLine($"      {a.Detail}");
        }
        return sb.ToString();
    }

    /// <summary>"Casework", "AFA", "CPN contact" — what kind of contact it was; plain "Contact" when no note says.</summary>
    public static string ContactLabel(UrgentCaseContactDto c) =>
        c.IsCpnContact ? "CPN contact" : c.Category switch
        {
            null => "Contact",
            "Afa" => "AFA",
            "DailyLog" => "Daily log",
            var other => other,
        };
}
