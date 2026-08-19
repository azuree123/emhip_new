using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using Xunit;

namespace Emhip.UnitTests.Domain;

public class CaseworkNoteTests
{
    private static CaseworkNote NewNote() =>
        new(Guid.NewGuid(), Guid.NewGuid(), CaseworkNoteCategory.Casework, ContactType.PhoneCall, DateTimeOffset.UtcNow);

    private static void Fill(CaseworkNote note, string? assessment = "Presenting as settled; no current risk.") =>
        note.Update(
            CaseworkNoteCategory.Casework, ContactType.PhoneCall, DateTimeOffset.UtcNow,
            situation: "Guest called to discuss sleep difficulties.",
            background: "Third contact this month.",
            assessment: assessment,
            recommendation: "GP referral for sleep; review in two weeks.",
            riskLevel: CaseworkRiskLevel.NoRiskDetected,
            guestReportedChanges: null, serviceInvolvementChanges: null,
            additionalNotes: null, nextContactDate: null,
            mdtDiscussionRequested: false, cpnReferralRequested: false);

    [Fact]
    public void A_new_note_starts_as_an_unsubmitted_draft()
    {
        var note = NewNote();

        Assert.Equal(CaseworkNoteStatus.Draft, note.Status);
        Assert.False(note.IsSubmitted);
        Assert.Null(note.SubmittedAt);
    }

    [Fact]
    public void Submitting_without_an_assessment_is_refused()
    {
        var note = NewNote();
        Fill(note, assessment: "   ");

        var error = Assert.Throws<InvalidOperationException>(() => note.Submit(Guid.NewGuid()));
        Assert.Contains("assessment is required", error.Message, StringComparison.OrdinalIgnoreCase);
        Assert.False(note.IsSubmitted);
    }

    [Fact]
    public void Submitting_stamps_the_time_and_links_the_contact_it_produced()
    {
        var note = NewNote();
        Fill(note);
        var contactId = Guid.NewGuid();

        note.Submit(contactId);

        Assert.True(note.IsSubmitted);
        Assert.Equal(contactId, note.ContactId);
        Assert.NotNull(note.SubmittedAt);
    }

    [Fact]
    public void A_submitted_note_cannot_be_edited_or_resubmitted()
    {
        var note = NewNote();
        Fill(note);
        note.Submit(Guid.NewGuid());

        // The clinical record is append-only: corrections go in a new note, not over the old one.
        Assert.Throws<InvalidOperationException>(() => Fill(note));
        Assert.Throws<InvalidOperationException>(() => note.Submit(Guid.NewGuid()));
    }

    [Fact]
    public void A_draft_can_be_revised_repeatedly_before_submission()
    {
        var note = NewNote();

        Fill(note, "First pass.");
        Fill(note, "Revised after speaking with the GP.");

        Assert.Equal("Revised after speaking with the GP.", note.Assessment);
        Assert.False(note.IsSubmitted);
    }
}

public class PathwayChangeTests
{
    [Fact]
    public void The_first_allocation_records_no_previous_pathway()
    {
        var change = new PathwayChange(
            Guid.NewGuid(), fromPathway: null, toPathway: GuestPathway.MentalWellbeing,
            reason: "Initial allocation at registration.", assignedByStaffId: Guid.NewGuid(),
            assignedByName: null, changedOn: new DateOnly(2026, 8, 19), recordedByStaffId: Guid.NewGuid());

        Assert.Null(change.FromPathway);
        Assert.Equal(GuestPathway.MentalWellbeing, change.ToPathway);
    }

    [Fact]
    public void A_change_keeps_both_the_effective_date_and_the_recorded_time()
    {
        // The worker's "date of change" is clinical fact; CreatedAt is when it was typed up.
        var changedOn = new DateOnly(2026, 5, 13);

        var change = new PathwayChange(
            Guid.NewGuid(), GuestPathway.MentalWellbeing, GuestPathway.ClinicalSupport,
            "Increased anxiety symptoms identified.", null, "Sarah Ahmed", changedOn, Guid.NewGuid());

        Assert.Equal(changedOn, change.ChangedOn);
        Assert.Equal("Sarah Ahmed", change.AssignedByName);
        Assert.True(change.CreatedAt > DateTimeOffset.MinValue);
    }
}
