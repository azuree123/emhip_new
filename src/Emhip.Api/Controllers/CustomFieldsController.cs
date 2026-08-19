using Emhip.Application.CustomFields;
using Emhip.Domain.Authorization;
using Emhip.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Emhip.Api.Controllers;

/// <summary>
/// Admin-defined extra fields on the configurable forms (guest, document, contact, follow-up,
/// action). Definitions are managed under the settings permission; the answers themselves are
/// guarded by the same permission as the record they hang off, so custom fields can never become
/// a side door into data a user can't otherwise see or edit.
/// </summary>
[ApiController]
[Route("custom-fields")]
[Authorize]
public sealed class CustomFieldsController(IMediator mediator) : ControllerBase
{
    /// <summary>Field definitions for a form — every signed-in user needs these to render it.</summary>
    [HttpGet]
    public async Task<IActionResult> GetDefinitions(
        [FromQuery] CustomFieldEntityType? entityType, [FromQuery] bool includeInactive = false, CancellationToken cancellationToken = default) =>
        Ok(await mediator.Send(new GetCustomFieldDefinitionsQuery(entityType, includeInactive), cancellationToken));

    [HttpPost]
    [Authorize(Policy = Permissions.Settings.Manage)]
    public async Task<IActionResult> Create([FromBody] CreateCustomFieldRequest request, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(
            new CreateCustomFieldCommand(request.EntityType, request.Label, request.FieldType, request.Options, request.HelpText, request.IsRequired),
            cancellationToken);
        return CreatedAtAction(nameof(GetDefinitions), new { entityType = request.EntityType }, new { id });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Permissions.Settings.Manage)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCustomFieldRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(
            new UpdateCustomFieldCommand(id, request.Label, request.FieldType, request.Options, request.HelpText,
                request.IsRequired, request.SortOrder, request.IsActive),
            cancellationToken);
        return NoContent();
    }

    /// <summary>Deletes an unused field; a field that already holds answers is deactivated instead.</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Permissions.Settings.Manage)]
    public async Task<ActionResult<DeleteCustomFieldResult>> Delete(Guid id, CancellationToken cancellationToken) =>
        Ok(await mediator.Send(new DeleteCustomFieldCommand(id), cancellationToken));

    [HttpPut("reorder")]
    [Authorize(Policy = Permissions.Settings.Manage)]
    public async Task<IActionResult> Reorder([FromBody] ReorderRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new ReorderCustomFieldsCommand(request.EntityType, request.OrderedIds), cancellationToken);
        return NoContent();
    }

    /// <summary>The active fields for a form, merged with this record's answers.</summary>
    [HttpGet("values/{entityType}/{entityId:guid}")]
    public async Task<IActionResult> GetValues(CustomFieldEntityType entityType, Guid entityId, CancellationToken cancellationToken)
    {
        if (!HasPermission(ViewPermissionFor(entityType))) return Forbid();
        return Ok(await mediator.Send(new GetCustomFieldValuesQuery(entityType, entityId), cancellationToken));
    }

    [HttpPut("values/{entityType}/{entityId:guid}")]
    public async Task<IActionResult> SaveValues(
        CustomFieldEntityType entityType, Guid entityId, [FromBody] SaveValuesRequest request, CancellationToken cancellationToken)
    {
        if (!HasPermission(EditPermissionFor(entityType))) return Forbid();

        await mediator.Send(new SaveCustomFieldValuesCommand(entityType, entityId, request.Entries), cancellationToken);
        return NoContent();
    }

    private bool HasPermission(string permission) => User.HasClaim(Permissions.ClaimType, permission);

    /// <summary>Answers inherit the visibility of the record they belong to.</summary>
    private static string ViewPermissionFor(CustomFieldEntityType entityType) => entityType switch
    {
        CustomFieldEntityType.Document => Permissions.Documents.View,
        CustomFieldEntityType.FollowUp => Permissions.FollowUps.View,
        _ => Permissions.Guests.View,
    };

    private static string EditPermissionFor(CustomFieldEntityType entityType) => entityType switch
    {
        CustomFieldEntityType.Document => Permissions.Documents.Edit,
        CustomFieldEntityType.FollowUp => Permissions.FollowUps.Manage,
        CustomFieldEntityType.Contact => Permissions.Guests.ContactsAdd,
        _ => Permissions.Guests.Edit,
    };

    public sealed record CreateCustomFieldRequest(
        CustomFieldEntityType EntityType, string Label, CustomFieldType FieldType,
        IReadOnlyList<string>? Options, string? HelpText, bool IsRequired);

    public sealed record UpdateCustomFieldRequest(
        string Label, CustomFieldType FieldType, IReadOnlyList<string>? Options,
        string? HelpText, bool IsRequired, int SortOrder, bool IsActive);

    public sealed record ReorderRequest(CustomFieldEntityType EntityType, IReadOnlyList<Guid> OrderedIds);

    public sealed record SaveValuesRequest(IReadOnlyList<CustomFieldEntry> Entries);
}
