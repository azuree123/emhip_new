using Emhip.Application.UrgentCases;
using Emhip.Domain.Enums;

namespace Emhip.UnitTests.UrgentCases;

public class UrgentEpisodeRecordTextTests
{
    [Theory]
    [InlineData(45, "45m")]
    [InlineData(150, "2h 30m")]
    [InlineData(1770, "1d 5h")]
    public void Duration_is_rendered_in_the_largest_useful_unit(long minutes, string expected) =>
        Assert.Equal(expected, UrgentEpisodeRecordText.Duration(minutes));

    [Fact]
    public void Export_contains_every_section_of_the_record()
    {
        var raisedAt = new DateTimeOffset(2025, 5, 5, 11, 0, 0, TimeSpan.Zero);
        var episodeId = Guid.NewGuid();
        var record = new UrgentEpisodeRecordDto(
            episodeId, Guid.NewGuid(), "Joyce Acheampong", 558, 1,
            [new UrgentEpisodeSummaryDto(episodeId, 1, raisedAt, raisedAt.AddHours(29))], 72,
            raisedAt, raisedAt.AddHours(72), "Patrick Osei", GuestPathway.MentalWellbeing, "Patrick Osei",
            raisedAt.AddHours(3), "Sunita Nair", "Crisis Resolution Team", "Risk level has increased", "Urgent", null,
            true, raisedAt.AddHours(29), "Sunita Nair", true, "CRT conducted home visit.",
            GuestPathway.ClinicalSupport, "Patrick Osei", new DateOnly(2025, 5, 13), "Yes — weekly CPN input added", false,
            1, 1770, 4,
            new UrgentEpisodeIntakeDto(Guid.NewGuid(), ["Suicidal ideation"], "Guest disclosed significant deterioration.", raisedAt, "Patrick Osei"),
            [new UrgentEpisodeTimelineEntryDto("flag", "Urgent flag raised", "Risk identified", null, raisedAt, "Patrick Osei")],
            [new UrgentEpisodeAuditEntryDto("green", "Episode resolved and locked", "06 May 2025 · 16:30 · Sunita Nair", raisedAt.AddHours(29))]);

        var text = UrgentEpisodeRecordText.Build(record);

        Assert.Contains("URGENT EPISODE RECORD", text);
        Assert.Contains("Joyce Acheampong (G-558)", text);
        Assert.Contains("Crisis Resolution Team", text);
        Assert.Contains("Guest disclosed significant deterioration.", text);
        Assert.Contains("CRT conducted home visit.", text);
        // The service's names for its three pathways, as used on every screen.
        Assert.Contains("Mental Wellbeing", text);
        Assert.Contains("Clinical Support", text);
        Assert.Contains("Yes — weekly CPN input added", text);
        Assert.Contains("1d 5h", text);
        Assert.Contains("Episode resolved and locked", text);
    }
}
