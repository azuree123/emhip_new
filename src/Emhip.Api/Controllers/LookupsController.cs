using Emhip.Application.Lookups;
using Emhip.Domain.Authorization;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Emhip.Api.Controllers;

/// <summary>
/// Configurable dropdown options. Reading is open to any signed-in user (forms need the
/// options); editing requires the lookups permission. Built-in options can be relabelled,
/// reordered or deactivated but never deleted, so stored records keep resolving.
/// </summary>
[ApiController]
[Route("lookups")]
[Authorize]
public sealed class LookupsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? category, [FromQuery] bool includeInactive = false, CancellationToken cancellationToken = default) =>
        Ok(await mediator.Send(new GetLookupsQuery(category, includeInactive), cancellationToken));

    [HttpPost]
    [Authorize(Policy = Permissions.Settings.ManageLookups)]
    public async Task<IActionResult> Create([FromBody] CreateLookupRequest request, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(new CreateLookupItemCommand(request.Category, request.Code, request.Label, request.SortOrder), cancellationToken);
        return CreatedAtAction(nameof(Get), new { category = request.Category }, new { id });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Permissions.Settings.ManageLookups)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateLookupRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new UpdateLookupItemCommand(id, request.Label, request.SortOrder, request.IsActive), cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Permissions.Settings.ManageLookups)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await mediator.Send(new DeleteLookupItemCommand(id), cancellationToken);
        return NoContent();
    }

    [HttpPut("reorder")]
    [Authorize(Policy = Permissions.Settings.ManageLookups)]
    public async Task<IActionResult> Reorder([FromBody] ReorderLookupRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new ReorderLookupItemsCommand(request.Category, request.OrderedIds), cancellationToken);
        return NoContent();
    }

    public sealed record CreateLookupRequest(string Category, string Code, string Label, int SortOrder);

    public sealed record UpdateLookupRequest(string Label, int SortOrder, bool IsActive);

    public sealed record ReorderLookupRequest(string Category, IReadOnlyList<Guid> OrderedIds);
}
