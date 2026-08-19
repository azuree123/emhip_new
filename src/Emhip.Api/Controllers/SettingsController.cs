using Emhip.Application.Settings;
using Emhip.Domain.Authorization;
using Emhip.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Emhip.Api.Controllers;

/// <summary>
/// Portal configuration. The full editor (GET/PUT /settings) is permission-gated; every signed-in
/// user can read the small non-secret subset the SPA needs for display and defaults. Secret
/// values are never returned — the UI only learns whether one is set.
/// </summary>
[ApiController]
[Route("settings")]
[Authorize]
public sealed class SettingsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = Permissions.Settings.View)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        Ok(await mediator.Send(new GetSettingsQuery(), cancellationToken));

    /// <summary>Display settings for the SPA shell (organisation name, date format, clinical thresholds…).</summary>
    [HttpGet("public")]
    public async Task<IActionResult> GetPublic(CancellationToken cancellationToken) =>
        Ok(await mediator.Send(new GetPublicSettingsQuery(), cancellationToken));

    [HttpPut]
    [Authorize(Policy = Permissions.Settings.Manage)]
    public async Task<IActionResult> Update([FromBody] Dictionary<string, string?> values, CancellationToken cancellationToken)
    {
        await mediator.Send(new UpdateSettingsCommand(values), cancellationToken);
        return NoContent();
    }

    /// <summary>Writes and removes a probe object to prove the storage credentials work before they're relied on.</summary>
    [HttpPost("storage/test")]
    [Authorize(Policy = Permissions.Settings.Manage)]
    public async Task<ActionResult<StorageTestResultDto>> TestStorage([FromBody] TestStorageRequest request, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(
            new TestStorageConnectionCommand(request.Provider, request.Values ?? new Dictionary<string, string?>()),
            cancellationToken);
        return Ok(result);
    }

    /// <summary>Sends a real message through the (possibly unsaved) email settings to prove delivery works.</summary>
    [HttpPost("email/test")]
    [Authorize(Policy = Permissions.Settings.Manage)]
    public async Task<ActionResult<Application.Emails.EmailTestResultDto>> TestEmail([FromBody] TestEmailRequest request, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(
            new Application.Emails.SendTestEmailCommand(request.ToEmail, request.Provider, request.Values ?? new Dictionary<string, string?>()),
            cancellationToken);
        return Ok(result);
    }

    public sealed record TestStorageRequest(DocumentStorageProvider Provider, Dictionary<string, string?>? Values);

    public sealed record TestEmailRequest(string ToEmail, string Provider, Dictionary<string, string?>? Values);
}
