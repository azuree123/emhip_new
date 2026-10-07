using Emhip.Application.UrgentCases;
using Emhip.Domain.Enums;

namespace Emhip.UnitTests.UrgentCases;

public class UrgentEpisodeRecordTextTests
{
    [Fact]
    public void Export_contains_every_section_of_the_record()
    {
        var raisedAt = new DateTimeOffset(2025, 5, 5, 11, 0, 0, TimeSpan.Zero);
        var episodeId = Guid.NewGuid();
        var record = new UrgentEpisodeRecordDto(
            episodeId, Guid.NewGuid(), "Joyce Acheampong", 558, 1,
            [new UrgentEpisodeSummaryDto(episodeId, 1, raisedAt, raisedAt.AddHours(29))], 72,
            "Patrick Osei", GuestPathway.MentalWellbeing,
            raisedAt, raisedAt.AddHours(72), true,
            "Sunita Nair", ["Suicidal Ideation", "Other: Financial crisis"], "Guest disclosed significant deterioration.",
            new UrgentCaseCmhtContactDto(true, "Crisis Resolution Team", "Dr Shah", raisedAt.AddHours(3), "Agreed a home visit.", "Sunita Nair", raisedAt.AddHours(3)),
            [new UrgentCaseContactDto(Guid.NewGuid(), raisedAt.AddHours(2), "Casework", false, "Phone call", "Patrick Osei")],
            raisedAt.AddHours(29), "Sunita Nair", true, true, "Ambulance", null,
            [new UrgentCaseAuditEntryDto("raised", "Urgent case raised", "Sunita Nair", raisedAt, "Suicidal Ideation")]);

        var text = UrgentEpisodeRecordText.Build(record);

        Assert.Contains("URGENT CASE RECORD — URGENT CASE 1 OF 1", text);
        Assert.Contains("G-558", text);
        Assert.Contains("Mental Wellbeing", text);
        Assert.Contains("Other: Financial crisis", text);
        Assert.Contains("Guest disclosed significant deterioration.", text);
        Assert.Contains("Dr Shah", text);
        Assert.Contains("Agreed a home visit.", text);
        Assert.Contains("Casework · Phone call", text);
        Assert.Contains("Ambulance", text);
        Assert.Contains("Urgent case raised — Sunita Nair", text);
        Assert.DoesNotContain("Episode", text);
        Assert.DoesNotContain("Crisis Episode", text);
    }

    [Theory]
    [InlineData("Casework", false, "Casework")]
    [InlineData("Afa", false, "AFA")]
    [InlineData(null, false, "Contact")]
    [InlineData(null, true, "CPN contact")]
    public void Contacts_are_labelled_by_the_type_the_worker_chose(string? category, bool cpn, string expected) =>
        Assert.Equal(expected, UrgentEpisodeRecordText.ContactLabel(new UrgentCaseContactDto(Guid.NewGuid(), DateTimeOffset.UtcNow, category, cpn, "Phone call", null)));
}
