using System.Text.RegularExpressions;
using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;

namespace Emhip.Api.Middleware;

/// <summary>
/// Logs every read of a guest-scoped resource — clinical-data compliance requirement (see
/// ARCHITECTURE.md "Clinical-data compliance"; write-side auditing is handled separately by
/// AuditSaveChangesInterceptor). Fire-and-forget-free: awaited, but on a resolved response so
/// it never delays the response body being flushed to the client.
/// </summary>
public sealed partial class AuditReadLoggingMiddleware(RequestDelegate next)
{
    [GeneratedRegex(@"^/guests/(?<guestId>[0-9a-fA-F-]{36})")]
    private static partial Regex GuestScopedPathRegex();

    public async Task InvokeAsync(HttpContext context, IAppDbContext db, ICurrentUser currentUser)
    {
        await next(context);

        if (!HttpMethods.IsGet(context.Request.Method)) return;

        var match = GuestScopedPathRegex().Match(context.Request.Path.Value ?? string.Empty);
        if (!match.Success || !Guid.TryParse(match.Groups["guestId"].Value, out var guestId)) return;

        db.AuditEvents.Add(new AuditEvent(guestId, currentUser.StaffId, AuditAction.Read, "Guest", guestId.ToString(), context.Request.Path));
        await db.SaveChangesAsync(context.RequestAborted);
    }
}
