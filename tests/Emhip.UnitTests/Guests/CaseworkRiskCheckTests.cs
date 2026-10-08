using Emhip.Application.Guests.Casework;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using FluentValidation.TestHelper;
using Xunit;

namespace Emhip.UnitTests.Guests;

/// <summary>The New Casework Note's single-choice risk assessment, AFA section and ticked-off actions.</summary>
public class CaseworkRiskCheckTests
{
    private readonly SaveCaseworkNoteCommandValidator _validator = new();

    private static CaseworkNote Draft(CaseworkRiskCheck? check, string? riskNotes, IReadOnlyCollection<Guid>? completed = null)
    {
        var note = new CaseworkNote(Guid.NewGuid(), Guid.NewGuid(), CaseworkNoteCategory.Casework, ContactType.InPerson, DateTimeOffset.UtcNow);
        note.Update(
            CaseworkNoteCategory.Casework, ContactType.InPerson, DateTimeOffset.UtcNow,
            situation: "Low mood since the anniversary.", background: null, assessment: "Grief is the main driver.", recommendation: null,
            riskLevel: CaseworkRiskLevel.NoRiskDetected, guestReportedChanges: null, serviceInvolvementChanges: null,
            additionalNotes: null, nextContactDate: new DateOnly(2026, 11, 1),
            mdtDiscussionRequested: false, cpnReferralRequested: false,
            riskNotes: riskNotes, riskCheck: check, completedActionIds: completed);
        return note;
    }

    private static SaveCaseworkNoteCommand Command(
        CaseworkRiskCheck? check, string? riskNotes = null, string? adviceType = null, ContactType? afaMethod = null) => new(
        Guid.NewGuid(), NoteId: null,
        new CaseworkNoteInput(
            CaseworkNoteCategory.Casework, ContactType.InPerson, DateTimeOffset.UtcNow,
            Situation: "Low mood.", Background: null, Assessment: "Grief is the main driver.", Recommendation: null,
            CaseworkRiskLevel.NoRiskDetected, RiskNotes: riskNotes, IsCpnContact: false, CpnSessionType: null,
            GuestReportedChanges: null, ServiceInvolvementChanges: null, AdditionalNotes: null,
            NextContactDate: new DateOnly(2026, 11, 1), MdtDiscussionRequested: false, CpnReferralRequested: false, Actions: [],
            AdviceType: adviceType, RiskCheck: check, AfaContactMethod: afaMethod),
        Submit: true);

    [Theory]
    [InlineData(CaseworkRiskCheck.NoneApply, CaseworkRiskLevel.NoRiskDetected)]
    [InlineData(CaseworkRiskCheck.NoteConcern, CaseworkRiskLevel.Medium)]
    [InlineData(CaseworkRiskCheck.SuicidalIdeationOrSelfHarm, CaseworkRiskLevel.High)]
    [InlineData(CaseworkRiskCheck.NoAccessToFood, CaseworkRiskLevel.High)]
    public void The_risk_check_sets_the_risk_level(CaseworkRiskCheck check, CaseworkRiskLevel expected)
    {
        var note = Draft(check, riskNotes: "Notes.");

        Assert.Equal(expected, note.RiskLevel);
        Assert.Equal(check, note.RiskCheck);
    }

    [Theory]
    [InlineData(CaseworkRiskCheck.NoneApply, false)]
    [InlineData(CaseworkRiskCheck.NoteConcern, false)]
    [InlineData(CaseworkRiskCheck.SuicidalIdeationOrSelfHarm, true)]
    [InlineData(CaseworkRiskCheck.RiskOfHarmToOthers, true)]
    [InlineData(CaseworkRiskCheck.PsychosisNotUnderMhTeam, true)]
    [InlineData(CaseworkRiskCheck.ImmediateRiskOfHomelessness, true)]
    [InlineData(CaseworkRiskCheck.NoAccessToFood, true)]
    [InlineData(CaseworkRiskCheck.SafeguardingConcern, true)]
    public void Only_the_six_criteria_are_immediate_risks(CaseworkRiskCheck check, bool immediate) =>
        Assert.Equal(immediate, CaseworkNote.IsImmediateRisk(check));

    [Fact]
    public void An_immediate_risk_cannot_be_submitted_without_crisis_notes()
    {
        var note = Draft(CaseworkRiskCheck.SafeguardingConcern, riskNotes: "  ");

        Assert.Throws<InvalidOperationException>(() => note.Submit(Guid.NewGuid()));
        Assert.False(note.IsSubmitted);
    }

    [Fact]
    public void Ticked_actions_survive_a_draft_save_without_duplicates()
    {
        var first = Guid.NewGuid();
        var second = Guid.NewGuid();

        var note = Draft(CaseworkRiskCheck.NoneApply, riskNotes: null, completed: [first, second, first]);

        Assert.Equal([first, second], note.CompletedActionIdList());
    }

    [Fact]
    public void The_validator_requires_crisis_notes_for_an_immediate_risk()
    {
        _validator.TestValidate(Command(CaseworkRiskCheck.RiskOfHarmToOthers))
            .ShouldHaveValidationErrorFor(x => x.Input.RiskNotes);
        _validator.TestValidate(Command(CaseworkRiskCheck.RiskOfHarmToOthers, riskNotes: "Hub Manager called at 10:47."))
            .ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void A_noted_concern_needs_its_description_but_none_apply_needs_nothing()
    {
        _validator.TestValidate(Command(CaseworkRiskCheck.NoteConcern))
            .ShouldHaveValidationErrorFor(x => x.Input.RiskNotes);
        _validator.TestValidate(Command(CaseworkRiskCheck.NoneApply))
            .ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void The_afa_section_needs_its_own_contact_method_once_advice_is_chosen()
    {
        _validator.TestValidate(Command(CaseworkRiskCheck.NoneApply, adviceType: "Housing"))
            .ShouldHaveValidationErrorFor(x => x.Input.AfaContactMethod);
        _validator.TestValidate(Command(CaseworkRiskCheck.NoneApply, adviceType: "Housing", afaMethod: ContactType.PhoneCall))
            .ShouldNotHaveAnyValidationErrors();
    }
}
