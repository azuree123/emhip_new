namespace Emhip.Application.Reports;

/// <summary>
/// A demographic cohort a report can be cross-filtered by — the same four filters the guest list
/// (GET /guests) accepts, with the same meaning, so "Black African · 18–24" selects the same guests
/// on the Guest Report as on the DIALOG Outcomes tab. Age is an inclusive band in years, resolved
/// against the date of birth at query time exactly as the guest list does.
/// </summary>
public sealed record ReportCohortFilter(string? Ethnicity, string? Gender, string? CountryOfOrigin, int? AgeMin, int? AgeMax)
{
    public static readonly ReportCohortFilter None = new(null, null, null, null, null);

    /// <summary>Builds a filter from query-string values, treating blank strings as "not filtered".</summary>
    public static ReportCohortFilter From(string? ethnicity, string? gender, string? countryOfOrigin, int? ageMin, int? ageMax) =>
        new(Blank(ethnicity), Blank(gender), Blank(countryOfOrigin), ageMin, ageMax);

    public bool IsEmpty =>
        Ethnicity is null && Gender is null && CountryOfOrigin is null && AgeMin is null && AgeMax is null;

    /// <summary>Latest date of birth inside the band: ageMin 35 ⇒ born on or before today − 35 years.</summary>
    public DateOnly? BornOnOrBefore(DateOnly today) => AgeMin is { } min ? today.AddYears(-min) : null;

    /// <summary>Earliest date of birth inside the band: ageMax 44 ⇒ born on or after today − 45 years + 1 day.</summary>
    public DateOnly? BornOnOrAfter(DateOnly today) => AgeMax is { } max ? today.AddYears(-(max + 1)).AddDays(1) : null;

    /// <summary>
    /// "Black African · 18–24 · Female · Somalia" — the label the Reports screen shows for the
    /// active cohort, reused on the Excel export so the two read the same. "All guests" when unfiltered.
    /// </summary>
    public string Describe()
    {
        if (IsEmpty) return "All guests";

        var parts = new List<string>();
        if (Ethnicity is not null) parts.Add(Ethnicity);
        if (AgeMin is not null || AgeMax is not null) parts.Add(AgeLabel());
        if (Gender is not null) parts.Add(Gender);
        if (CountryOfOrigin is not null) parts.Add(CountryOfOrigin);
        return string.Join(" · ", parts);
    }

    // Mirrors the client's AGE_BANDS labels ("Under 18", "18–24", "65 and over").
    private string AgeLabel() => (AgeMin, AgeMax) switch
    {
        (null, { } max) => $"Under {max + 1}",
        ({ } min, null) => $"{min} and over",
        ({ } min, { } max) => $"{min}–{max}",
        _ => string.Empty,
    };

    private static string? Blank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

/// <summary>
/// The age groups reports break guests down by — the same bands as the client's AGE_BANDS filter
/// options and the dashboard demographics card, so an export's "18–24" row matches the filter.
/// </summary>
public static class ReportAgeBands
{
    public static readonly IReadOnlyList<string> Labels =
        ["Under 18", "18–24", "25–34", "35–44", "45–54", "55–64", "65 and over"];

    /// <summary>Age in whole years on <paramref name="today"/>, bucketed into one of <see cref="Labels"/>.</summary>
    public static string LabelFor(DateOnly dateOfBirth, DateOnly today)
    {
        var age = today.Year - dateOfBirth.Year;
        if (dateOfBirth > today.AddYears(-age)) age--;
        return age switch
        {
            < 18 => "Under 18",
            < 25 => "18–24",
            < 35 => "25–34",
            < 45 => "35–44",
            < 55 => "45–54",
            < 65 => "55–64",
            _ => "65 and over",
        };
    }
}
