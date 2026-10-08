using System.Globalization;
using System.Text;
using Emhip.Application.Abstractions;
using Emhip.Application.Reports;
using Emhip.Domain.Authorization;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Emhip.Api.Controllers;

/// <summary>
/// Reports screen: the report tabs, the Excel workbook and the streaming CSV export. Every tab
/// takes the screen's shared reporting period (from / to, yyyy-MM-dd); on the tabs that used to
/// be unscoped the pair is optional, and leaving it off keeps the old all-records behaviour.
/// </summary>
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
    /// "Outcome dimensions" report — DIALOG averages, baseline vs latest reassessment, over the
    /// assessments recorded in the period. The optional demographic filters (same names and
    /// meaning as GET /guests) narrow every figure to a cohort.
    /// </summary>
    [HttpGet("dialog-outcomes")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetDialogOutcomes(
        [FromQuery] DateOnly? from = null, [FromQuery] DateOnly? to = null,
        [FromQuery] string? ethnicity = null, [FromQuery] string? gender = null, [FromQuery] string? countryOfOrigin = null,
        [FromQuery] int? ageMin = null, [FromQuery] int? ageMax = null, CancellationToken cancellationToken = default)
    {
        var cohort = ReportCohortFilter.From(ethnicity, gender, countryOfOrigin, ageMin, ageMax);
        var result = await mediator.Send(
            new GetDialogOutcomesReportQuery(currentUser.HubId, cohort, ReportPeriod.Create(from, to)), cancellationToken);
        return Ok(result);
    }

    /// <summary>"Pathway Analytics" tab — per-pathway totals, statuses, AFA and DIALOG averages for the guests registered in the period.</summary>
    [HttpGet("pathway-analytics")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetPathwayAnalytics(
        [FromQuery] DateOnly? from = null, [FromQuery] DateOnly? to = null, CancellationToken cancellationToken = default) =>
        Ok(await mediator.Send(new GetPathwayAnalyticsQuery(currentUser.HubId, ReportPeriod.Create(from, to)), cancellationToken));

    /// <summary>"Caseload Reports" tab — current per-CMHW caseload, with the overdue and recorded contacts of the period.</summary>
    [HttpGet("caseload")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetCaseload(
        [FromQuery] DateOnly? from = null, [FromQuery] DateOnly? to = null, CancellationToken cancellationToken = default) =>
        Ok(await mediator.Send(new GetCaseloadReportQuery(currentUser.HubId, ReportPeriod.Create(from, to)), cancellationToken));

    /// <summary>"Data Quality" tab — record-completeness issue counts for the guests registered in the period.</summary>
    [HttpGet("data-quality")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetDataQuality(
        [FromQuery] DateOnly? from = null, [FromQuery] DateOnly? to = null, CancellationToken cancellationToken = default) =>
        Ok(await mediator.Send(new GetDataQualityReportQuery(currentUser.HubId, ReportPeriod.Create(from, to)), cancellationToken));

    /// <summary>"CPN Activity" tab — the CPN referral pipeline and the guests on the CPN caseload.</summary>
    [HttpGet("cpn-activity")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetCpnActivity([FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken cancellationToken) =>
        Ok(await mediator.Send(new GetCpnActivityQuery(currentUser.HubId, from, to), cancellationToken));

    /// <summary>Contacts by type and outcome within the range.</summary>
    [HttpGet("contacts-breakdown")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetContactsBreakdown([FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken cancellationToken) =>
        Ok(await mediator.Send(new GetContactsBreakdownQuery(currentUser.HubId, from, to), cancellationToken));

    /// <summary>"DIALOG score trend" — monthly average total score in the period, optionally for a demographic cohort.</summary>
    [HttpGet("dialog-trend")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetDialogTrend(
        [FromQuery] DateOnly? from = null, [FromQuery] DateOnly? to = null,
        [FromQuery] string? ethnicity = null, [FromQuery] string? gender = null, [FromQuery] string? countryOfOrigin = null,
        [FromQuery] int? ageMin = null, [FromQuery] int? ageMax = null, CancellationToken cancellationToken = default) =>
        Ok(await mediator.Send(
            new GetDialogTrendQuery(
                currentUser.HubId, ReportCohortFilter.From(ethnicity, gender, countryOfOrigin, ageMin, ageMax), ReportPeriod.Create(from, to)),
            cancellationToken));

    /// <summary>"Referral sources" breakdown of the guests registered in the period.</summary>
    [HttpGet("referral-sources")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetReferralSources(
        [FromQuery] DateOnly? from = null, [FromQuery] DateOnly? to = null, CancellationToken cancellationToken = default) =>
        Ok(await mediator.Send(new GetReferralSourcesQuery(currentUser.HubId, ReportPeriod.Create(from, to)), cancellationToken));

    /// <summary>"How guests heard about us" for the guests registered in the period, one count per box ticked.</summary>
    [HttpGet("heard-about-us")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetHeardAboutUs(
        [FromQuery] DateOnly? from = null, [FromQuery] DateOnly? to = null, CancellationToken cancellationToken = default) =>
        Ok(await mediator.Send(new GetHeardAboutUsQuery(currentUser.HubId, ReportPeriod.Create(from, to)), cancellationToken));

    /// <summary>"Export history" tab — the hub's most recent exports taken in the period.</summary>
    [HttpGet("exports")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetExportHistory(
        [FromQuery] DateOnly? from = null, [FromQuery] DateOnly? to = null, CancellationToken cancellationToken = default) =>
        Ok(await mediator.Send(new GetExportHistoryQuery(currentUser.HubId, ReportPeriod.Create(from, to)), cancellationToken));

    /// <summary>
    /// Multi-sheet Excel workbook: summary, demographics, referral sources, pathways, caseload, DIALOG
    /// outcomes and data quality (spec §5.4), every sheet for the reporting period. The optional
    /// demographic filters are the DIALOG Outcomes tab's cohort and apply to the DIALOG outcomes sheet only.
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
        Response.Headers.ContentDisposition = $"attachment; filename=\"emhip-guests-{from:yyyy-MM-dd}-{to:yyyy-MM-dd}.csv\"";

        // One row per guest registered in the period, with their clinical pathway, demographics,
        // referral source and how they heard about us.
        await Response.WriteAsync(
            "GuestRef,GuestName,Pathway,Status,RegisteredAt,Ethnicity,AgeGroup,Gender,CountryOfOrigin,ReferralSource,ReferralType,HeardAboutUs\n",
            cancellationToken);

        await foreach (var row in reportReads.StreamExportAsync(currentUser.HubId, from, to, cancellationToken))
        {
            var line = new StringBuilder()
                .Append("G-").Append(row.GuestNumber).Append(',')
                .Append(CsvEscape(row.GuestName)).Append(',')
                .Append(row.Pathway).Append(',')
                .Append(row.Status).Append(',')
                .Append(row.RegisteredAt.ToString("O", CultureInfo.InvariantCulture)).Append(',')
                .Append(CsvEscape(row.Ethnicity ?? string.Empty)).Append(',')
                .Append(CsvEscape(row.AgeGroup)).Append(',')
                .Append(CsvEscape(row.Gender ?? string.Empty)).Append(',')
                .Append(CsvEscape(row.CountryOfOrigin ?? string.Empty)).Append(',')
                .Append(CsvEscape(row.ReferralSource ?? string.Empty)).Append(',')
                .Append(row.ReferralType ?? string.Empty).Append(',')
                .Append(CsvEscape(row.HeardAboutUs ?? string.Empty))
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
