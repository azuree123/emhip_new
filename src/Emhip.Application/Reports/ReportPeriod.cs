namespace Emhip.Application.Reports;

/// <summary>
/// The Reports screen's reporting period — the one From / To range shared by every tab and by the
/// exports. Both dates are inclusive and read as whole UTC days, the same way the date-ranged
/// reports have always read them.
/// </summary>
public sealed record ReportPeriod(DateOnly From, DateOnly To)
{
    /// <summary>Start of <see cref="From"/> (00:00 UTC).</summary>
    public DateTimeOffset Start => new(From.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);

    /// <summary>End of <see cref="To"/> (23:59:59.9999999 UTC).</summary>
    public DateTimeOffset End => new(To.ToDateTime(TimeOnly.MaxValue), TimeSpan.Zero);

    /// <summary>A period from optional query-string dates; null unless both are given.</summary>
    public static ReportPeriod? Create(DateOnly? from, DateOnly? to) =>
        from is { } f && to is { } t ? new ReportPeriod(f, t) : null;

    /// <summary>"06 Apr 2026 to 06 Oct 2026" — how the exports label the period.</summary>
    public string Describe() => $"{From:dd MMM yyyy} to {To:dd MMM yyyy}";
}
