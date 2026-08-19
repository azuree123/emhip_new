using System.Text.RegularExpressions;

namespace Emhip.Application.Emails;

/// <summary>
/// Fills <c>{{token}}</c> placeholders. Deliberately not a full templating engine — admins edit
/// these in a textarea, and anything with logic or loops would be a support burden (and a
/// sandbox-escape risk) in a clinical system.
/// </summary>
public static partial class TemplateRenderer
{
    public static string Render(string template, IReadOnlyDictionary<string, string?> tokens) =>
        TokenPattern().Replace(template, match =>
            tokens.TryGetValue(match.Groups[1].Value, out var value) ? value ?? string.Empty : string.Empty);

    /// <summary>Plain-text alternative for clients that don't render HTML.</summary>
    public static string StripHtml(string html)
    {
        var withBreaks = BreakPattern().Replace(html, "\n");
        var text = TagPattern().Replace(withBreaks, string.Empty);
        return BlankLinePattern().Replace(System.Net.WebUtility.HtmlDecode(text), "\n\n").Trim();
    }

    /// <summary>Placeholder values so the Settings editor can show a realistic preview.</summary>
    public static IReadOnlyDictionary<string, string?> SampleTokens(EmailTemplateDefinition definition, string organisationName, string? portalUrl) =>
        new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            ["organisationName"] = organisationName,
            ["supportEmail"] = "support@example.org",
            ["portalUrl"] = portalUrl ?? "https://portal.example.org",
            ["year"] = DateTime.UtcNow.Year.ToString(),
            ["recipientName"] = "Alex Morgan",
            ["resetUrl"] = $"{portalUrl ?? "https://portal.example.org"}/reset-password?token=sample",
            ["email"] = "alex.morgan@example.org",
            ["temporaryPassword"] = "Temp!Pass2026",
            ["guestName"] = "Jordan Fielding",
            ["guestReference"] = "G-1042",
            ["riskFlags"] = "Suicidal ideation, Safeguarding concern",
            ["raisedAt"] = DateTime.UtcNow.ToString("dd MMM yyyy HH:mm"),
            ["guestUrl"] = $"{portalUrl ?? "https://portal.example.org"}/guests/00000000-0000-0000-0000-000000000000",
            ["responseHours"] = "72",
            ["overdueCount"] = "3",
            ["followUpList"] = "<ul><li>Jordan Fielding (G-1042) — due 12 Aug 2026</li><li>Sam Okafor (G-1088) — due 14 Aug 2026</li></ul>",
            ["providerName"] = "SMTP",
        };

    [GeneratedRegex(@"\{\{\s*(\w+)\s*\}\}")]
    private static partial Regex TokenPattern();

    [GeneratedRegex(@"<(br|/p|/div|/tr|/h\d|/li)\s*/?>", RegexOptions.IgnoreCase)]
    private static partial Regex BreakPattern();

    [GeneratedRegex("<.*?>", RegexOptions.Singleline)]
    private static partial Regex TagPattern();

    [GeneratedRegex(@"\n{3,}")]
    private static partial Regex BlankLinePattern();
}
