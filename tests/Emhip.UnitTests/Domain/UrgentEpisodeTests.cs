using Emhip.Domain.Entities;
using Emhip.Domain.Enums;

namespace Emhip.UnitTests.Domain;

public class UrgentEpisodeTests
{
    private static UrgentEpisode Open(DateTimeOffset raisedAt) =>
        new(Guid.NewGuid(), raisedAt, Guid.NewGuid(), Guid.NewGuid(), GuestPathway.MentalWellbeing, Guid.NewGuid());

    [Fact]
    public void Opening_an_episode_snapshots_the_pathway_and_cmhw_at_the_time_of_the_flag()
    {
        var cmhw = Guid.NewGuid();
        var episode = new UrgentEpisode(Guid.NewGuid(), DateTimeOffset.UtcNow, Guid.NewGuid(), Guid.NewGuid(), GuestPathway.ClinicalSupport, cmhw);

        Assert.Equal(GuestPathway.ClinicalSupport, episode.PathwayAtFlag);
        Assert.Equal(cmhw, episode.AssignedCmhwIdAtFlag);
        Assert.False(episode.IsResolved);
    }

    [Fact]
    public void Deadline_is_the_response_window_after_the_flag_was_raised()
    {
        var raisedAt = new DateTimeOffset(2025, 5, 5, 11, 0, 0, TimeSpan.Zero);
        var episode = Open(raisedAt);

        Assert.Equal(raisedAt.AddHours(72), episode.DeadlineAt(72));
        Assert.Null(episode.ResolvedWithinWindow(72));
    }

    [Fact]
    public void Resolving_records_the_pathway_re_entry_decision_and_locks_the_episode()
    {
        var episode = Open(DateTimeOffset.UtcNow.AddHours(-30));
        var staff = Guid.NewGuid();
        var cmhw = Guid.NewGuid();
        var nextContact = new DateOnly(2025, 5, 13);

        episode.Resolve(staff, "Home visit done.", GuestPathway.ClinicalSupport, cmhw, nextContact, "Yes — weekly CPN input added", inpatientAdmission: false);

        Assert.True(episode.IsResolved);
        Assert.Equal(staff, episode.ResolvedByStaffId);
        Assert.Equal(GuestPathway.ClinicalSupport, episode.PathwayAfterResolution);
        Assert.Equal(cmhw, episode.CmhwAfterResolutionStaffId);
        Assert.Equal(nextContact, episode.NextContactDate);
        Assert.Equal("Yes — weekly CPN input added", episode.SessionFrequencyChange);
        Assert.False(episode.InpatientAdmission);
        Assert.True(episode.ResolvedWithinWindow(72));

        Assert.Throws<InvalidOperationException>(() => episode.Resolve(staff, "again"));
        Assert.Throws<InvalidOperationException>(() => episode.EscalateToCmht(staff, "CRT", null, null, null));
    }

    [Fact]
    public void An_episode_resolved_after_the_window_reports_it()
    {
        var episode = Open(DateTimeOffset.UtcNow.AddHours(-100));
        episode.Resolve(Guid.NewGuid(), null);

        Assert.False(episode.ResolvedWithinWindow(72));
    }
}
