using Emhip.Application.Guests.Casework;
using Emhip.Application.Guests.Pathways;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using FluentValidation.TestHelper;
using Xunit;

namespace Emhip.UnitTests.Guests;

public class ChangeGuestPathwayCommandValidatorTests
{
    private readonly ChangeGuestPathwayCommandValidator _validator = new();

    private static ChangeGuestPathwayCommand Command(string? reason) => new(
        Guid.NewGuid(), GuestPathway.ClinicalSupport, reason, Guid.NewGuid(), AssignedByName: null,
        ChangedOn: DateOnly.FromDateTime(DateTime.UtcNow));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Rejects_a_pathway_change_without_a_reason(string? reason)
    {
        var result = _validator.TestValidate(Command(reason));
        result.ShouldHaveValidationErrorFor(x => x.Reason);
    }

    [Fact]
    public void Accepts_a_pathway_change_with_a_reason()
    {
        var result = _validator.TestValidate(Command("Increased anxiety symptoms identified."));
        result.ShouldNotHaveAnyValidationErrors();
    }
}

public class SaveCaseworkNoteCommandValidatorTests
{
    private readonly SaveCaseworkNoteCommandValidator _validator = new();

    private static SaveCaseworkNoteCommand Command(
        bool submit, DateOnly? nextContact, bool noNextContactRequired = false,
        CaseworkNoteCategory category = CaseworkNoteCategory.Casework, string? assessment = "Presenting as settled.",
        string? activityType = null, string? occasion = null) => new(
        Guid.NewGuid(), NoteId: null,
        new CaseworkNoteInput(
            category, ContactType.PhoneCall, DateTimeOffset.UtcNow,
            Situation: null, Background: null, Assessment: assessment, Recommendation: null,
            CaseworkRiskLevel.NoRiskDetected, RiskNotes: null, IsCpnContact: false, CpnSessionType: null,
            GuestReportedChanges: null, ServiceInvolvementChanges: null, AdditionalNotes: null,
            NextContactDate: nextContact, MdtDiscussionRequested: false, CpnReferralRequested: false, Actions: [],
            NoNextContactRequired: noNextContactRequired, ActivityType: activityType, Occasion: occasion),
        submit);

    [Theory]
    [InlineData(CaseworkNoteCategory.Hospitality)]
    [InlineData(CaseworkNoteCategory.Afa)]
    public void Short_form_contacts_need_no_assessment_or_next_contact(CaseworkNoteCategory category)
    {
        var result = _validator.TestValidate(Command(submit: true, nextContact: null, category: category, assessment: null));
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void An_activity_contact_needs_an_activity_or_an_occasion()
    {
        var missing = _validator.TestValidate(Command(true, null, category: CaseworkNoteCategory.Activity, assessment: null));
        missing.ShouldHaveValidationErrorFor(x => x.Input.ActivityType);

        _validator.TestValidate(Command(true, null, category: CaseworkNoteCategory.Activity, assessment: null, activityType: "Community lunch"))
            .ShouldNotHaveAnyValidationErrors();
        _validator.TestValidate(Command(true, null, category: CaseworkNoteCategory.Activity, assessment: null, occasion: "Eid celebration"))
            .ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void A_hospitality_note_can_be_submitted_without_an_assessment()
    {
        var note = new CaseworkNote(Guid.NewGuid(), Guid.NewGuid(), CaseworkNoteCategory.Hospitality, ContactType.InPerson, DateTimeOffset.UtcNow);
        note.Update(
            CaseworkNoteCategory.Hospitality, ContactType.InPerson, DateTimeOffset.UtcNow,
            situation: null, background: null, assessment: null, recommendation: null,
            riskLevel: CaseworkRiskLevel.NoRiskDetected, guestReportedChanges: null, serviceInvolvementChanges: null,
            additionalNotes: "Came with a friend.", nextContactDate: null,
            mdtDiscussionRequested: false, cpnReferralRequested: false);

        note.Submit(Guid.NewGuid());

        Assert.True(note.IsSubmitted);
    }

    [Fact]
    public void Submitting_without_a_next_contact_date_is_refused()
    {
        var result = _validator.TestValidate(Command(submit: true, nextContact: null));
        result.ShouldHaveValidationErrorFor(x => x.Input.NextContactDate);
    }

    [Fact]
    public void Ticking_no_next_contact_needed_bypasses_the_date()
    {
        var result = _validator.TestValidate(Command(submit: true, nextContact: null, noNextContactRequired: true));
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Submitting_with_a_next_contact_date_is_accepted()
    {
        var result = _validator.TestValidate(Command(submit: true, nextContact: DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7))));
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void A_draft_may_leave_the_next_contact_date_empty()
    {
        var result = _validator.TestValidate(Command(submit: false, nextContact: null));
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Opting_out_clears_any_date_on_the_note()
    {
        var note = new CaseworkNote(Guid.NewGuid(), Guid.NewGuid(), CaseworkNoteCategory.Casework, ContactType.PhoneCall, DateTimeOffset.UtcNow);

        note.Update(
            CaseworkNoteCategory.Casework, ContactType.PhoneCall, DateTimeOffset.UtcNow,
            situation: null, background: null, assessment: "Settled.", recommendation: null,
            riskLevel: CaseworkRiskLevel.NoRiskDetected, guestReportedChanges: null, serviceInvolvementChanges: null,
            additionalNotes: null, nextContactDate: new DateOnly(2026, 11, 1),
            mdtDiscussionRequested: false, cpnReferralRequested: false, noNextContactRequired: true);

        Assert.True(note.NoNextContactRequired);
        Assert.Null(note.NextContactDate);
    }
}
