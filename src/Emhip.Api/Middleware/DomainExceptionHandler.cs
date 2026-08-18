using Emhip.Application.Documents;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Emhip.Api.Middleware;

/// <summary>
/// Turns the domain's expected failures into meaningful status codes instead of 500s:
/// a missing aggregate is a 404, a rejected upload or broken invariant (checked-out document,
/// retained document, duplicate lookup code) is a 400 whose message is safe to show the user.
/// </summary>
public sealed class DomainExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (status, title) = exception switch
        {
            KeyNotFoundException => (StatusCodes.Status404NotFound, "Not found"),
            DocumentUploadRejectedException => (StatusCodes.Status400BadRequest, "Upload rejected"),
            InvalidOperationException => (StatusCodes.Status400BadRequest, "Request could not be completed"),
            FileNotFoundException => (StatusCodes.Status404NotFound, "Stored file is missing"),
            _ => (0, string.Empty),
        };

        if (status == 0) return false;

        httpContext.Response.StatusCode = status;
        await httpContext.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = exception.Message,
        }, cancellationToken);

        return true;
    }
}
