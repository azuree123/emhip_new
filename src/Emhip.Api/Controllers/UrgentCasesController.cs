using System.Text;
using Emhip.Application.Abstractions;
using Emhip.Application.UrgentCases;
using Emhip.Domain.Authorization;
using Emhip.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Emhip.Api.Controllers;

[ApiController]
[Route("urgent-cases")]
[Authorize(Policy = Permissions.UrgentCases.View)]
public sealed class UrgentCasesController(IMediator mediator, ICurrentUser currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetUrgentCasesQuery(currentUser.HubId), cancellationToken);
        return Ok(result);
    }

    /// <summary>Resolved urgent cases — backs the resolved rows on the Urgent Cases screen.</summary>
    [HttpGet("resolved")]
    public async Task<IActionResult> GetResolved(CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetResolvedUrgentEpisodesQuery(currentUser.HubId), cancellationToken);
        return Ok(result);
    }

    /// <summary>The guest's currently open urgent case (CMHT contact, resolution state); 404 when none.</summary>
    [HttpGet("{guestId:guid}/episode")]
    public async Task<ActionResult<UrgentEpisodeDto>> GetOpenEpisode(Guid guestId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetOpenUrgentEpisodeQuery(guestId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Every urgent case for the guest, oldest first — the "Urgent Case 1 / 2 / 3" tabs on the record screen.</summary>
    [HttpGet("{guestId:guid}/episodes")]
    public async Task<IActionResult> GetEpisodes(Guid guestId, CancellationToken cancellationToken) =>
        Ok(await mediator.Send(new GetGuestUrgentEpisodesQuery(currentUser.HubId, guestId), cancellationToken));

    /// <summary>The Urgent Case Record for one urgent case. Viewing it is written to the access log.</summary>
    [HttpGet("episodes/{episodeId:guid}")]
    public async Task<ActionResult<UrgentEpisodeRecordDto>> GetEpisodeRecord(Guid episodeId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetUrgentEpisodeRecordQuery(currentUser.HubId, episodeId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>"Export Record" — plain-text copy of the Urgent Case Record. Logged against the guest.</summary>
    [HttpGet("episodes/{episodeId:guid}/export")]
    public async Task<IActionResult> ExportEpisodeRecord(Guid episodeId, CancellationToken cancellationToken)
    {
        var export = await mediator.Send(new ExportUrgentEpisodeRecordQuery(currentUser.HubId, episodeId), cancellationToken);
        if (export is null) return NotFound();
        return File(Encoding.UTF8.GetBytes(export.Content), "text/plain; charset=utf-8", export.FileName);
    }

    /// <summary>
    /// "CMHT or other NHS team notified" — records by hand whether the CMHT was called, who was
    /// spoken to, when and what was said (EMHIP has no system connection to the CMHT).
    /// </summary>
    [HttpPut("episodes/{episodeId:guid}/cmht-contact")]
    [Authorize(Policy = Permissions.Guests.ClinicalEdit)]
    public async Task<IActionResult> RecordCmhtContact(Guid episodeId, [FromBody] RecordCmhtContactRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(
            new RecordCmhtContactCommand(currentUser.HubId, episodeId, request.Notified, request.Team, request.ContactName, request.CalledAt, request.Notes),
            cancellationToken);
        return NoContent();
    }

    /// <summary>"Mark as resolved" — closes and locks the guest's open urgent case and returns the guest to Active.</summary>
    [HttpPost("{guestId:guid}/resolve")]
    [Authorize(Policy = Permissions.Guests.ClinicalEdit)]
    public async Task<IActionResult> Resolve(Guid guestId, [FromBody] ResolveUrgentCaseRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(
            new ResolveUrgentCaseCommand(
                guestId, request.ResolutionNote, request.PathwayAfterResolution, request.NextContactDate,
                request.SessionFrequencyChange, request.InpatientAdmission, request.ExternalServicesInvolved),
            cancellationToken);
        return NoContent();
    }

    /// <summary>"Mark as resolved" on the Urgent Case Record — resolves exactly this urgent case (400 if it already is).</summary>
    [HttpPost("episodes/{episodeId:guid}/resolve")]
    [Authorize(Policy = Permissions.Guests.ClinicalEdit)]
    public async Task<IActionResult> ResolveEpisode(Guid episodeId, [FromBody] ResolveUrgentCaseRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(
            new ResolveUrgentCaseCommand(
                Guid.Empty, request.ResolutionNote, request.PathwayAfterResolution, request.NextContactDate,
                request.SessionFrequencyChange, request.InpatientAdmission, request.ExternalServicesInvolved,
                EpisodeId: episodeId, HubId: currentUser.HubId),
            cancellationToken);
        return NoContent();
    }

    public sealed record RecordCmhtContactRequest(bool Notified, string? Team, string? ContactName, DateTimeOffset? CalledAt, string? Notes);

    public sealed record ResolveUrgentCaseRequest(
        string? ResolutionNote,
        GuestPathway? PathwayAfterResolution = null,
        DateOnly? NextContactDate = null,
        string? SessionFrequencyChange = null,
        bool InpatientAdmission = false,
        string? ExternalServicesInvolved = null);
}
