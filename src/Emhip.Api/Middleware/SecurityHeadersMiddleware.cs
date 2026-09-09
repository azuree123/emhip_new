namespace Emhip.Api.Middleware;

/// <summary>
/// Browser-side hardening for every API response (UK GDPR Art. 32 "appropriate technical
/// measures"): no MIME sniffing, no framing, no referrer leakage of guest URLs, no caching of
/// clinical data in shared caches or on disk, and a locked-down Content-Security-Policy for the
/// JSON/Swagger responses the API itself serves. The Angular bundle's own CSP lives in
/// client/nginx.conf.
/// </summary>
public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var headers = context.Response.Headers;
        headers["X-Content-Type-Options"] = "nosniff";
        headers["X-Frame-Options"] = "DENY";
        headers["Referrer-Policy"] = "no-referrer";
        headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=(), usb=()";
        headers["Cross-Origin-Opener-Policy"] = "same-origin";
        headers["Cross-Origin-Resource-Policy"] = "same-site";

        // Swagger UI needs inline scripts/styles; everything else the API returns is data.
        headers["Content-Security-Policy"] = context.Request.Path.StartsWithSegments("/swagger")
            ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'"
            : "default-src 'none'; frame-ancestors 'none'";

        // Personal data must never be served from a cache the user did not create themselves.
        if (!context.Request.Path.StartsWithSegments("/health") && !headers.ContainsKey("Cache-Control"))
        {
            headers["Cache-Control"] = "no-store";
            headers["Pragma"] = "no-cache";
        }

        await next(context);
    }
}
