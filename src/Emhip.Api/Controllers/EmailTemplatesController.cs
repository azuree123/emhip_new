using Emhip.Application.Emails;
using Emhip.Domain.Authorization;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Emhip.Api.Controllers;

/// <summary>
/// Editable transactional email templates. The keys are fixed by the code that sends them; the
/// wording, subject and on/off switch are the admin's. Disabling a template stops that
/// notification without affecting the action that triggers it.
/// </summary>
[ApiController]
[Route("email-templates")]
[Authorize(Policy = Permissions.Settings.View)]
public sealed class EmailTemplatesController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        Ok(await mediator.Send(new GetEmailTemplatesQuery(), cancellationToken));

    [HttpPut("{key}")]
    [Authorize(Policy = Permissions.Settings.Manage)]
    public async Task<IActionResult> Update(string key, [FromBody] UpdateEmailTemplateRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new UpdateEmailTemplateCommand(key, request.Subject, request.HtmlBody, request.TextBody, request.IsEnabled), cancellationToken);
        return NoContent();
    }

    /// <summary>Restores the template shipped with the application.</summary>
    [HttpPost("{key}/reset")]
    [Authorize(Policy = Permissions.Settings.Manage)]
    public async Task<IActionResult> Reset(string key, CancellationToken cancellationToken)
    {
        await mediator.Send(new ResetEmailTemplateCommand(key), cancellationToken);
        return NoContent();
    }

    /// <summary>Renders with sample data — pass unsaved editor content to preview it before saving.</summary>
    [HttpPost("{key}/preview")]
    public async Task<ActionResult<EmailPreviewDto>> Preview(string key, [FromBody] PreviewRequest? request, CancellationToken cancellationToken) =>
        Ok(await mediator.Send(new PreviewEmailTemplateQuery(key, request?.Subject, request?.HtmlBody), cancellationToken));

    public sealed record UpdateEmailTemplateRequest(string Subject, string HtmlBody, string? TextBody, bool IsEnabled);

    public sealed record PreviewRequest(string? Subject, string? HtmlBody);
}
