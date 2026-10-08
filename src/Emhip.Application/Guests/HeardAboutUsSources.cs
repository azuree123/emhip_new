using Emhip.Domain.Enums;

namespace Emhip.Application.Guests;

/// <summary>
/// "How did you hear about us?" between the guest's bit mask and the wire, where it travels as a
/// list of enum names (["Nhs", "SocialMedia"]) the client binds to its tickboxes. The labels are
/// mirrored by HEARD_ABOUT_US_OPTIONS in client/src/app/core/demographic-options.ts.
/// </summary>
public static class HeardAboutUsSources
{
    /// <summary>The tickboxes in the order the form shows them.</summary>
    public static readonly IReadOnlyList<HeardAboutUsSource> All =
    [
        HeardAboutUsSource.Nhs,
        HeardAboutUsSource.OtherStatutoryServices,
        HeardAboutUsSource.SocialMedia,
        HeardAboutUsSource.Outreach,
        HeardAboutUsSource.Other,
    ];

    public static HeardAboutUsSource Combine(IEnumerable<HeardAboutUsSource>? sources) =>
        sources?.Aggregate(HeardAboutUsSource.None, (mask, source) => mask | source) ?? HeardAboutUsSource.None;

    /// <summary>The ticked sources, in form order; empty when the question wasn't answered.</summary>
    public static IReadOnlyList<HeardAboutUsSource> Split(HeardAboutUsSource mask) =>
        All.Where(source => mask.HasFlag(source)).ToList();

    public static string Label(HeardAboutUsSource source) => source switch
    {
        HeardAboutUsSource.Nhs => "NHS",
        HeardAboutUsSource.OtherStatutoryServices => "Other statutory services",
        HeardAboutUsSource.SocialMedia => "Social media",
        HeardAboutUsSource.Outreach => "Outreach",
        HeardAboutUsSource.Other => "Other",
        _ => source.ToString(),
    };

    /// <summary>"NHS, Other — a friend" for exports; null when nothing was ticked.</summary>
    public static string? Describe(HeardAboutUsSource mask, string? other)
    {
        var labels = Split(mask)
            .Select(source => source == HeardAboutUsSource.Other && !string.IsNullOrWhiteSpace(other)
                ? $"Other — {other.Trim()}"
                : Label(source))
            .ToList();
        return labels.Count == 0 ? null : string.Join(", ", labels);
    }
}
