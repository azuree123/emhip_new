using Emhip.Application.Abstractions;
using Emhip.Application.Documents;
using Emhip.Domain.Authorization;
using Emhip.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Emhip.Api.Controllers;

/// <summary>
/// The Document Management module: every file in the system is uploaded, versioned, downloaded
/// and retired through here. Bytes live in whichever storage backend is configured on the
/// Settings page; this controller only ever deals in streams so a 200 MB request never lands in
/// memory as a byte[].
/// </summary>
[ApiController]
[Route("documents")]
[Authorize]
public sealed class DocumentsController(IMediator mediator, ICurrentUser currentUser) : ControllerBase
{
    /// <summary>Document register — keyset-paginated. `deletedOnly=true` is the recycle bin.</summary>
    [HttpGet]
    [Authorize(Policy = Permissions.Documents.View)]
    public async Task<IActionResult> GetList(
        [FromQuery] string? q, [FromQuery] Guid? guestId, [FromQuery] string? category,
        [FromQuery] DocumentStatus? status, [FromQuery] string? tag,
        [FromQuery] bool includeDeleted = false, [FromQuery] bool deletedOnly = false,
        [FromQuery] string? cursor = null, [FromQuery] int pageSize = 50, CancellationToken cancellationToken = default)
    {
        var result = await mediator.Send(
            new GetDocumentListQuery(currentUser.HubId, q, guestId, category, status, tag, includeDeleted, deletedOnly,
                cursor, Math.Clamp(pageSize, 1, 200)),
            cancellationToken);
        return Ok(result);
    }

    /// <summary>Header tiles: counts by state, stored bytes, and the active storage backend.</summary>
    [HttpGet("stats")]
    [Authorize(Policy = Permissions.Documents.View)]
    public async Task<IActionResult> GetStats(CancellationToken cancellationToken) =>
        Ok(await mediator.Send(new GetDocumentStatsQuery(currentUser.HubId), cancellationToken));

    [HttpGet("{documentId:guid}")]
    [Authorize(Policy = Permissions.Documents.View)]
    public async Task<ActionResult<DocumentDetailDto>> GetDetail(Guid documentId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetDocumentDetailQuery(currentUser.HubId, documentId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Uploads a new document (multipart/form-data) and stores it as version 1.</summary>
    [HttpPost]
    [Authorize(Policy = Permissions.Documents.Upload)]
    [RequestSizeLimit(524_288_000)]
    public async Task<IActionResult> Upload(
        IFormFile file,
        [FromForm] string title,
        [FromForm] string category,
        [FromForm] Guid? guestId,
        [FromForm] string? description,
        [FromForm] string? tags,
        [FromForm] DateOnly? retainUntil,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0) return BadRequest(new { error = "No file was uploaded." });

        await using var stream = file.OpenReadStream();
        var id = await mediator.Send(
            new UploadDocumentCommand(
                title, category, file.FileName, ContentTypeOf(file), stream, file.Length,
                guestId, description, tags, retainUntil),
            cancellationToken);

        return CreatedAtAction(nameof(GetDetail), new { documentId = id }, new { id });
    }

    /// <summary>Uploads a replacement file as the next version.</summary>
    [HttpPost("{documentId:guid}/versions")]
    [Authorize(Policy = Permissions.Documents.Edit)]
    [RequestSizeLimit(524_288_000)]
    public async Task<IActionResult> AddVersion(
        Guid documentId, IFormFile file, [FromForm] string? changeNote, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0) return BadRequest(new { error = "No file was uploaded." });

        await using var stream = file.OpenReadStream();
        var version = await mediator.Send(
            new AddDocumentVersionCommand(documentId, file.FileName, ContentTypeOf(file), stream, file.Length, changeNote),
            cancellationToken);

        return Ok(new { versionNumber = version });
    }

    /// <summary>Streams the current version (or a specific one) straight from storage.</summary>
    [HttpGet("{documentId:guid}/download")]
    [Authorize(Policy = Permissions.Documents.View)]
    public async Task<IActionResult> Download(Guid documentId, [FromQuery] int? version, CancellationToken cancellationToken)
    {
        var download = await mediator.Send(new GetDocumentDownloadQuery(currentUser.HubId, documentId, version), cancellationToken);
        if (download is null) return NotFound();

        // Lets the client verify the bytes match what was recorded at upload time.
        Response.Headers["X-Document-Sha256"] = download.Sha256;
        return File(download.Content, download.ContentType, download.FileName, enableRangeProcessing: true);
    }

    [HttpPut("{documentId:guid}")]
    [Authorize(Policy = Permissions.Documents.Edit)]
    public async Task<IActionResult> UpdateMetadata(Guid documentId, [FromBody] UpdateDocumentRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(
            new UpdateDocumentMetadataCommand(documentId, request.Title, request.Description, request.Category,
                request.Tags, request.Status, request.RetainUntil),
            cancellationToken);
        return NoContent();
    }

    /// <summary>Soft delete — the document moves to the recycle bin and stays restorable.</summary>
    [HttpDelete("{documentId:guid}")]
    [Authorize(Policy = Permissions.Documents.Delete)]
    public async Task<IActionResult> Delete(Guid documentId, [FromQuery] string? reason, CancellationToken cancellationToken)
    {
        await mediator.Send(new DeleteDocumentCommand(documentId, reason), cancellationToken);
        return NoContent();
    }

    [HttpPost("{documentId:guid}/restore")]
    [Authorize(Policy = Permissions.Documents.Restore)]
    public async Task<IActionResult> Restore(Guid documentId, CancellationToken cancellationToken)
    {
        await mediator.Send(new RestoreDocumentCommand(documentId), cancellationToken);
        return NoContent();
    }

    /// <summary>Permanent deletion, including the stored files. Blocked while the retention date stands.</summary>
    [HttpDelete("{documentId:guid}/purge")]
    [Authorize(Policy = Permissions.Documents.Purge)]
    public async Task<IActionResult> Purge(Guid documentId, CancellationToken cancellationToken)
    {
        await mediator.Send(new PurgeDocumentCommand(documentId), cancellationToken);
        return NoContent();
    }

    /// <summary>Check-out locks the document so only the holder can upload the next version.</summary>
    [HttpPost("{documentId:guid}/checkout")]
    [Authorize(Policy = Permissions.Documents.Edit)]
    public async Task<IActionResult> CheckOut(Guid documentId, CancellationToken cancellationToken)
    {
        await mediator.Send(new SetDocumentCheckOutCommand(documentId, CheckOut: true), cancellationToken);
        return NoContent();
    }

    /// <summary>Releases the lock. `force=true` (managers) clears someone else's lock.</summary>
    [HttpPost("{documentId:guid}/checkin")]
    [Authorize(Policy = Permissions.Documents.Edit)]
    public async Task<IActionResult> CheckIn(Guid documentId, [FromQuery] bool force = false, CancellationToken cancellationToken = default)
    {
        await mediator.Send(new SetDocumentCheckOutCommand(documentId, CheckOut: false, Force: force), cancellationToken);
        return NoContent();
    }

    private static string ContentTypeOf(IFormFile file) =>
        string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType;

    public sealed record UpdateDocumentRequest(
        string Title, string? Description, string Category, string? Tags, DocumentStatus Status, DateOnly? RetainUntil);
}
