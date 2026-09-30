using System.Globalization;
using System.Text;
using Emhip.Application.Abstractions;
using Emhip.Application.Reports;
using Emhip.Domain.Authorization;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Emhip.Api.Controllers;

/// <summary>Reports screen: pathway category aggregates plus a streaming CSV export.</summary>
[ApiController]
[Route("reports")]
[Authorize]
public sealed class ReportsController(
    IMediator mediator, IReportReadService reportReads, ICurrentUser currentUser, IExcelWorkbookBuilder workbookBuilder) : ControllerBase
{
    [HttpGet("pathways")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetPathwayReport([FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetPathwayReportQuery(currentUser.HubId, from, to), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// "Outcome dimensions" report — DIALOG averages, baseline vs latest reassessment. The optional
    /// demographic filters (same names and meaning as GET /guests) narrow every figure to a cohort.
    /// </summary>
    [HttpGet("dialog-outcomes")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetDialogOutcomes(
        [FromQuery] string? ethnicity = null, [FromQuery] string? gender = null, [FromQuery] string? countryOfOrigin = null,
        [FromQuery] int? ageMin = null, [FromQuery] int? ageMax = null, CancellationToken cancellationToken = default)
    {
        var cohort = ReportCohortFilter.From(ethnicity, gender, countryOfOrigin, ageMin, ageMax);
        var result = await mediator.Send(new GetDialogOutcomesReportQuery(currentUser.HubId, cohort), cancellationToken);
        return Ok(result);
    }

    /// <summary>"Pathway Analytics" tab — per-pathway guest totals, statuses, AFA and DIALOG averages.</summary>
    [HttpGet("pathway-analytics")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetPathwayAnalytics(CancellationToken cancellationToken) =>
        Ok(await mediator.Send(new GetPathwayAnalyticsQuery(currentUser.HubId), cancellationToken));

    /// <summary>"Caseload Reports" tab — per-CMHW caseload, urgent counts, overdue follow-ups, recent contacts.</summary>
    [HttpGet("caseload")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetCaseload(CancellationToken cancellationToken) =>
        Ok(await mediator.Send(new GetCaseloadReportQuery(currentUser.HubId), cancellationToken));

    /// <summary>"Data Quality" tab — record-completeness issue counts.</summary>
    [HttpGet("data-quality")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetDataQuality(CancellationToken cancellationToken) =>
        Ok(await mediator.Send(new GetDataQualityReportQuery(currentUser.HubId), cancellationToken));

    /// <summary>"CPN Activity" — contacts by type and outcome within the range.</summary>
    /// <summary>"CPN Activity" tab — the CPN referral pipeline and the guests on the CPN caseload.</summary>
    [HttpGet("cpn-activity")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetCpnActivity([FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken cancellationToken) =>
        Ok(await mediator.Send(new GetCpnActivityQuery(currentUser.HubId, from, to), cancellationToken));

    [HttpGet("contacts-breakdown")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetContactsBreakdown([FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken cancellationToken) =>
        Ok(await mediator.Send(new GetContactsBreakdownQuery(currentUser.HubId, from, to), cancellationToken));

    /// <summary>"DIALOG score trend" — monthly average total score, optionally for a demographic cohort.</summary>
    [HttpGet("dialog-trend")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetDialogTrend(
        [FromQuery] string? ethnicity = null, [FromQuery] string? gender = null, [FromQuery] string? countryOfOrigin = null,
        [FromQuery] int? ageMin = null, [FromQuery] int? ageMax = null, CancellationToken cancellationToken = default) =>
        Ok(await mediator.Send(
            new GetDialogTrendQuery(currentUser.HubId, ReportCohortFilter.From(ethnicity, gender, countryOfOrigin, ageMin, ageMax)),
            cancellationToken));

    /// <summary>"Referral sources" breakdown.</summary>
    [HttpGet("referral-sources")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetReferralSources(CancellationToken cancellationToken) =>
        Ok(await mediator.Send(new GetReferralSourcesQuery(currentUser.HubId), cancellationToken));

    /// <summary>"Export history" tab — most recent exports for the hub.</summary>
    [HttpGet("exports")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetExportHistory(CancellationToken cancellationToken) =>
        Ok(await mediator.Send(new GetExportHistoryQuery(currentUser.HubId), cancellationToken));

    /// <summary>
    /// Multi-sheet Excel workbook: summary, demographics, referral sources, pathways, caseload, DIALOG
    /// outcomes and data quality (spec §5.4). The optional demographic filters are the DIALOG
    /// Outcomes tab's cohort and apply to the DIALOG outcomes sheet only.
    /// </summary>
    [HttpGet("export.xlsx")]
    [Authorize(Policy = Permissions.Reports.Export)]
    public async Task<IActionResult> ExportWorkbook(
        [FromQuery] DateOnly from, [FromQuery] DateOnly to,
        [FromQuery] string? ethnicity = null, [FromQuery] string? gender = null, [FromQuery] string? countryOfOrigin = null,
        [FromQuery] int? ageMin = null, [FromQuery] int? ageMax = null, CancellationToken cancellationToken = default)
    {
        var cohort = ReportCohortFilter.From(ethnicity, gender, countryOfOrigin, ageMin, ageMax);
        var report = await mediator.Send(new GetServiceReportExportQuery(currentUser.HubId, from, to, cohort), cancellationToken);
        var bytes = workbookBuilder.BuildServiceReport(report);

        await mediator.Send(new RecordExportCommand("ServiceWorkbookXlsx", from, to), cancellationToken);

        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"emhip-service-report-{from:yyyy-MM-dd}-{to:yyyy-MM-dd}.xlsx");
    }

    /// <summary>
    /// Streams CSV rows as they're read from the database — never buffers the full export in
    /// memory, per ARCHITECTURE.md "Streaming for exports/reports".
    /// </summary>
    [HttpGet("export")]
    [Authorize(Policy = Permissions.Reports.Export)]
    public async Task Export([FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken cancellationToken)
    {
        Response.ContentType = "text/csv";
        Response.Headers.ContentDisposition = $"attachment; filename=\"pathway-report-{from:yyyy-MM-dd}-{to:yyyy-MM-dd}.csv\"";

        // The demographic and referral columns are appended after the original five, so anything
        // reading the file by position keeps working.
        await Response.WriteAsync(
            "GuestId,GuestName,Category,Status,ReferredAt,Ethnicity,AgeGroup,Gender,CountryOfOrigin,ReferralSource,ReferralType\n",
            cancellationToken);

        await foreach (var row in reportReads.StreamExportAsync(currentUser.HubId, from, to, cancellationToken))
        {
            var line = new StringBuilder()
                .Append(row.GuestId).Append(',')
                .Append(CsvEscape(row.GuestName)).Append(',')
                .Append(row.Category).Append(',')
                .Append(row.Status).Append(',')
                .Append(row.ReferredAt.ToString("O", CultureInfo.InvariantCulture)).Append(',')
                .Append(CsvEscape(row.Ethnicity ?? string.Empty)).Append(',')
                .Append(CsvEscape(row.AgeGroup)).Append(',')
                .Append(CsvEscape(row.Gender ?? string.Empty)).Append(',')
                .Append(CsvEscape(row.CountryOfOrigin ?? string.Empty)).Append(',')
                .Append(CsvEscape(row.ReferralSource ?? string.Empty)).Append(',')
                .Append(row.ReferralType ?? string.Empty)
                .Append('\n');

            await Response.WriteAsync(line.ToString(), cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }

        await mediator.Send(new RecordExportCommand("PathwayCsv", from, to), cancellationToken);
    }

    private static string CsvEscape(string value) =>
        value.IndexOfAny([',', '"', '\n', '\r']) >= 0
            ? $"\"{value.Replace("\"", "\"\"")}\""
            : value;
}
