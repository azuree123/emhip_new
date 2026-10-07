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
        Assert.Throws<InvalidOperationException>(() => episode.RecordCmhtContact(staff, true, "CRT", "Dr Shah", DateTimeOffset.UtcNow, null));
    }

    [Fact]
    public void Recording_a_cmht_call_keeps_who_was_called_when_and_what_was_said()
    {
        var episode = Open(DateTimeOffset.UtcNow.AddHours(-5));
        var staff = Guid.NewGuid();
        var calledAt = DateTimeOffset.UtcNow.AddHours(-1);

        episode.RecordCmhtContact(staff, true, " Crisis Resolution Team ", "Dr Shah", calledAt, "Agreed a home visit today.");

        Assert.True(episode.CmhtNotified);
        Assert.Equal("Crisis Resolution Team", episode.CmhtTeam);
        Assert.Equal("Dr Shah", episode.CmhtContactName);
        Assert.Equal(calledAt, episode.CmhtCalledAt);
        Assert.Equal("Agreed a home visit today.", episode.CmhtCallNotes);
        Assert.Equal(staff, episode.CmhtRecordedByStaffId);
        Assert.NotNull(episode.CmhtRecordedAt);
    }

    [Fact]
    public void Answering_no_clears_any_call_details()
    {
        var episode = Open(DateTimeOffset.UtcNow.AddHours(-5));
        episode.RecordCmhtContact(Guid.NewGuid(), true, null, "Dr Shah", DateTimeOffset.UtcNow, "Call");

        episode.RecordCmhtContact(Guid.NewGuid(), false, "ignored", "ignored", DateTimeOffset.UtcNow, "ignored");

        Assert.False(episode.CmhtNotified);
        Assert.Null(episode.CmhtContactName);
        Assert.Null(episode.CmhtCalledAt);
        Assert.Null(episode.CmhtCallNotes);
    }

    [Fact]
    public void Correcting_a_recorded_call_keeps_who_made_it()
    {
        var episode = Open(DateTimeOffset.UtcNow.AddHours(-5));
        var caller = Guid.NewGuid();
        episode.RecordCmhtContact(caller, true, "CRT", "Dr Shah", DateTimeOffset.UtcNow.AddHours(-1), null);
        var recordedAt = episode.CmhtRecordedAt;

        episode.RecordCmhtContact(Guid.NewGuid(), true, "Crisis Resolution Team", "Dr Shah", DateTimeOffset.UtcNow.AddHours(-1), "Typo fixed");

        Assert.Equal(caller, episode.CmhtRecordedByStaffId);
        Assert.Equal(recordedAt, episode.CmhtRecordedAt);
        Assert.Equal("Crisis Resolution Team", episode.CmhtTeam);
    }

    [Fact]
    public void A_cmht_call_needs_the_person_and_the_time()
    {
        var episode = Open(DateTimeOffset.UtcNow.AddHours(-5));

        Assert.Throws<InvalidOperationException>(() => episode.RecordCmhtContact(Guid.NewGuid(), true, null, " ", DateTimeOffset.UtcNow, null));
        Assert.Throws<InvalidOperationException>(() => episode.RecordCmhtContact(Guid.NewGuid(), true, null, "Dr Shah", null, null));
    }

    [Fact]
    public void Resolving_records_any_other_external_service()
    {
        var episode = Open(DateTimeOffset.UtcNow.AddHours(-5));

        episode.Resolve(Guid.NewGuid(), null, null, null, null, null, inpatientAdmission: true, externalServicesInvolved: "Ambulance, A&E");

        Assert.True(episode.InpatientAdmission);
        Assert.Equal("Ambulance, A&E", episode.ExternalServicesInvolved);
    }

    [Fact]
    public void An_episode_resolved_after_the_window_reports_it()
    {
        var episode = Open(DateTimeOffset.UtcNow.AddHours(-100));
        episode.Resolve(Guid.NewGuid(), null);

        Assert.False(episode.ResolvedWithinWindow(72));
    }
}
