using Emhip.Application.Reports;

namespace Emhip.UnitTests.Reports;

public class ReportCohortFilterTests
{
    private static readonly DateOnly Today = new(2026, 9, 30);

    [Fact]
    public void From_treats_blank_strings_as_not_filtered()
    {
        var filter = ReportCohortFilter.From(" ", "", null, null, null);

        Assert.True(filter.IsEmpty);
        Assert.Equal("All guests", filter.Describe());
    }

    [Fact]
    public void From_trims_values()
    {
        var filter = ReportCohortFilter.From(" Black African ", null, null, null, null);

        Assert.Equal("Black African", filter.Ethnicity);
        Assert.False(filter.IsEmpty);
    }

    [Theory]
    [InlineData(18, 24, "Black African · 18–24")]
    [InlineData(null, 17, "Black African · Under 18")]
    [InlineData(65, null, "Black African · 65 and over")]
    public void Describe_uses_the_age_band_labels_the_filter_offers(int? ageMin, int? ageMax, string expected)
    {
        var filter = ReportCohortFilter.From("Black African", null, null, ageMin, ageMax);

        Assert.Equal(expected, filter.Describe());
    }

    [Fact]
    public void Describe_lists_every_applied_filter_in_screen_order()
    {
        var filter = ReportCohortFilter.From("Black African", "Female", "Somalia", 25, 34);

        Assert.Equal("Black African · 25–34 · Female · Somalia", filter.Describe());
    }

    [Fact]
    public void Age_band_window_matches_the_guest_list_birth_date_window()
    {
        // 18–24 on 30 Sep 2026: an 18th birthday today is in, a 25th birthday tomorrow is still in.
        var filter = ReportCohortFilter.From(null, null, null, 18, 24);

        Assert.Equal(new DateOnly(2008, 9, 30), filter.BornOnOrBefore(Today));
        Assert.Equal(new DateOnly(2001, 10, 1), filter.BornOnOrAfter(Today));
    }

    [Fact]
    public void Open_ended_bands_leave_the_other_bound_unset()
    {
        Assert.Null(ReportCohortFilter.From(null, null, null, null, 17).BornOnOrBefore(Today));
        Assert.Null(ReportCohortFilter.From(null, null, null, 65, null).BornOnOrAfter(Today));
    }

    [Theory]
    [InlineData("2008-09-30", "18–24")] // 18th birthday today
    [InlineData("2008-10-01", "Under 18")] // 18th birthday tomorrow
    [InlineData("2001-10-01", "18–24")] // 25th birthday tomorrow
    [InlineData("2001-09-30", "25–34")] // 25th birthday today
    [InlineData("1961-09-30", "65 and over")]
    public void Age_bands_bucket_on_the_exact_birthday(string dateOfBirth, string expected)
    {
        Assert.Equal(expected, ReportAgeBands.LabelFor(DateOnly.Parse(dateOfBirth), Today));
    }

    [Fact]
    public void Every_age_band_label_is_reachable_and_in_order()
    {
        var labels = Enumerable.Range(0, 100)
            .Select(age => ReportAgeBands.LabelFor(Today.AddYears(-age), Today))
            .Distinct()
            .ToList();

        Assert.Equal(ReportAgeBands.Labels, labels);
    }
}
