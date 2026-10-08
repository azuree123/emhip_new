using Emhip.Application.UrgentCases;
using FluentValidation.TestHelper;
using Xunit;

namespace Emhip.UnitTests.UrgentCases;

public class ResolveUrgentCaseCommandValidatorTests
{
    private readonly ResolveUrgentCaseCommandValidator _validator = new();

    private static ResolveUrgentCaseCommand Command(string? note) =>
        new(Guid.Empty, note, InpatientAdmission: false, EpisodeId: Guid.NewGuid(), HubId: Guid.NewGuid());

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void A_case_cannot_be_resolved_without_the_action_taken(string? note)
    {
        var result = _validator.TestValidate(Command(note));
        result.ShouldHaveValidationErrorFor(x => x.ResolutionNote)
            .WithErrorMessage("Record the action taken to resolve this urgent case.");
    }

    [Fact]
    public void Accepts_a_resolution_with_the_action_taken()
    {
        var result = _validator.TestValidate(Command("Crisis team visited; safety plan agreed and CMHW follow-up booked."));
        result.ShouldNotHaveAnyValidationErrors();
    }
}
