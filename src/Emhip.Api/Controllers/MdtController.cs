using Emhip.Application.Abstractions;
using Emhip.Application.Mdt;
using Emhip.Domain.Authorization;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Emhip.Api.Controllers;

/// <summary>The Hub Manager's MDT queue (design Frame 54): CPN referrals, initial reviews and discussion requests.</summary>
[ApiController]
[Route("mdt")]
[Authorize(Policy = Permissions.Mdt.Manage)]
public sealed class MdtController(IMediator mediator, ICurrentUser currentUser) : ControllerBase
{
    /// <summary>Pending items oldest-first, plus the most recently reviewed ones.</summary>
    [HttpGet("queue")]
    public async Task<IActionResult> GetQueue(CancellationToken cancellationToken) =>
        Ok(await mediator.Send(new GetMdtQueueQuery(currentUser.HubId), cancellationToken));

    /// <summary>"Confirm assign CPN" — allocates the CPN and starts tracking CPN activity for the guest.</summary>
    [HttpPost("{itemId:guid}/confirm-cpn")]
    public async Task<IActionResult> ConfirmCpn(Guid itemId, [FromBody] ConfirmCpnRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new ConfirmCpnReferralCommand(itemId, request.AssignedCpnStaffId, request.ConfirmationNote), cancellationToken);
        return NoContent();
    }

    /// <summary>"Decline with reason".</summary>
    [HttpPost("{itemId:guid}/decline")]
    public async Task<IActionResult> Decline(Guid itemId, [FromBody] DeclineMdtRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new DeclineMdtItemCommand(itemId, request.Reason, request.Context), cancellationToken);
        return NoContent();
    }

    /// <summary>"Mark as discussed" — the MDT note is required.</summary>
    [HttpPost("{itemId:guid}/discussed")]
    public async Task<IActionResult> MarkDiscussed(Guid itemId, [FromBody] MarkDiscussedRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new MarkMdtDiscussedCommand(itemId, request.MdtNote), cancellationToken);
        return NoContent();
    }

    public sealed record ConfirmCpnRequest(Guid AssignedCpnStaffId, string? ConfirmationNote);
    public sealed record DeclineMdtRequest(string Reason, string? Context);
    public sealed record MarkDiscussedRequest(string MdtNote);
}
