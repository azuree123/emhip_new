using System.Text.RegularExpressions;
using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;

namespace Emhip.Api.Middleware;

/// <summary>
/// Logs every successful read of a guest-scoped resource — clinical-data compliance requirement
/// (see ARCHITECTURE.md "Clinical-data compliance"; UK GDPR accountability). Write-side auditing
/// is handled separately by AuditSaveChangesInterceptor, and reads that cannot be attributed to
/// a guest from the URL alone (episode records by episode id, document downloads, exports) are
/// written explicitly through IAuditTrail by their handlers. Awaited, but on a resolved response
/// so it never delays the response body being flushed to the client.
/// </summary>
public sealed partial class AuditReadLoggingMiddleware(RequestDelegate next)
{
    [GeneratedRegex(@"^/(?<area>guests|urgent-cases)/(?<guestId>[0-9a-fA-F-]{36})")]
    private static partial Regex GuestScopedPathRegex();

    public async Task InvokeAsync(HttpContext context, IAppDbContext db, ICurrentUser currentUser)
    {
        await next(context);

        if (!HttpMethods.IsGet(context.Request.Method)) return;
        // Only reads that actually returned data are access events; a 403/404 revealed nothing.
        if (context.Response.StatusCode is < 200 or >= 300) return;

        var match = GuestScopedPathRegex().Match(context.Request.Path.Value ?? string.Empty);
        if (!match.Success || !Guid.TryParse(match.Groups["guestId"].Value, out var guestId)) return;

        var entityName = match.Groups["area"].Value == "urgent-cases" ? "UrgentEpisode" : "Guest";
        db.AuditEvents.Add(new AuditEvent(guestId, currentUser.StaffId, AuditAction.Read, entityName, guestId.ToString(), context.Request.Path));
        await db.SaveChangesAsync(context.RequestAborted);
    }
}
