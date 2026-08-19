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

    /// <summary>"Outcome dimensions" report — hub-wide DIALOG averages, baseline vs latest follow-up.</summary>
    [HttpGet("dialog-outcomes")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetDialogOutcomes(CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetDialogOutcomesReportQuery(currentUser.HubId), cancellationToken);
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
    [HttpGet("contacts-breakdown")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetContactsBreakdown([FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken cancellationToken) =>
        Ok(await mediator.Send(new GetContactsBreakdownQuery(currentUser.HubId, from, to), cancellationToken));

    /// <summary>"DIALOG score trend" — monthly average total score.</summary>
    [HttpGet("dialog-trend")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<IActionResult> GetDialogTrend(CancellationToken cancellationToken) =>
        Ok(await mediator.Send(new GetDialogTrendQuery(currentUser.HubId), cancellationToken));

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

    /// <summary>Multi-sheet Excel workbook: summary, pathways, caseload, DIALOG outcomes and data quality (spec §5.4).</summary>
    [HttpGet("export.xlsx")]
    [Authorize(Policy = Permissions.Reports.Export)]
    public async Task<IActionResult> ExportWorkbook([FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken cancellationToken)
    {
        var report = await mediator.Send(new GetServiceReportExportQuery(currentUser.HubId, from, to), cancellationToken);
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

        await Response.WriteAsync("GuestId,GuestName,Category,Status,ReferredAt\n", cancellationToken);

        await foreach (var row in reportReads.StreamExportAsync(currentUser.HubId, from, to, cancellationToken))
        {
            var line = new StringBuilder()
                .Append(row.GuestId).Append(',')
                .Append(CsvEscape(row.GuestName)).Append(',')
                .Append(row.Category).Append(',')
                .Append(row.Status).Append(',')
                .Append(row.ReferredAt.ToString("O", CultureInfo.InvariantCulture))
                .Append('\n');

            await Response.WriteAsync(line.ToString(), cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }

        await mediator.Send(new RecordExportCommand("PathwayCsv", from, to), cancellationToken);
    }

    private static string CsvEscape(string value) =>
        value.Contains(',') || value.Contains('"')
            ? $"\"{value.Replace("\"", "\"\"")}\""
            : value;
}
