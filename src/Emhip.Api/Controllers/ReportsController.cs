using System.Globalization;
using System.Text;
using Emhip.Application.Abstractions;
using Emhip.Application.Reports;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Emhip.Api.Controllers;

/// <summary>Reports screen: pathway category aggregates plus a streaming CSV export.</summary>
[ApiController]
[Route("reports")]
public sealed class ReportsController(IMediator mediator, IReportReadService reportReads, ICurrentUser currentUser) : ControllerBase
{
    [HttpGet("pathways")]
    public async Task<IActionResult> GetPathwayReport([FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetPathwayReportQuery(currentUser.HubId, from, to), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Streams CSV rows as they're read from the database — never buffers the full export in
    /// memory, per ARCHITECTURE.md "Streaming for exports/reports".
    /// </summary>
    [HttpGet("export")]
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
    }

    private static string CsvEscape(string value) =>
        value.Contains(',') || value.Contains('"')
            ? $"\"{value.Replace("\"", "\"\"")}\""
            : value;
}
