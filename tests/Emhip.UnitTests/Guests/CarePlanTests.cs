using Emhip.Application.Guests.CarePlans;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using FluentValidation.TestHelper;
using Xunit;

namespace Emhip.UnitTests.Guests;

public class SaveCarePlanCommandValidatorTests
{
    private readonly SaveCarePlanCommandValidator _validator = new();

    private static SaveCarePlanCommand Command(
        string? guestVoice = "Reduce anxiety about housing.",
        string? support = "Weekly phone contact with CMHW.",
        DateOnly? nextContact = null,
        DateOnly? review = null,
        bool? cpn = false,
        CarePlanNhsReferral? nhs = CarePlanNhsReferral.NotAppropriate,
        IReadOnlyList<CarePlanGoalInput>? goals = null) => new(
            Guid.NewGuid(), guestVoice, support, BetweenSessions: null, Referrals: null, OtherNotes: null,
            nextContact ?? new DateOnly(2025, 5, 20), review ?? new DateOnly(2025, 6, 5), cpn, nhs,
            goals ?? [new CarePlanGoalInput(null, "Attend one community activity a week", CarePlanGoalStatus.NotStarted, null, null)]);

    [Fact]
    public void Accepts_a_complete_plan() =>
        _validator.TestValidate(Command()).ShouldNotHaveAnyValidationErrors();

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public void Requires_what_the_guest_wants_to_work_on(string? guestVoice) =>
        _validator.TestValidate(Command(guestVoice: guestVoice)).ShouldHaveValidationErrorFor(x => x.GuestVoice);

    [Fact]
    public void Requires_the_support_we_will_provide() =>
        _validator.TestValidate(Command(support: "")).ShouldHaveValidationErrorFor(x => x.SupportArrangements);

    [Fact]
    public void Requires_the_review_and_next_steps_answers()
    {
        var command = Command() with { NextContactOn = null, ReviewDueOn = null, CpnInvolvementRequired = null, NhsReferral = null };
        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor(x => x.NextContactOn);
        result.ShouldHaveValidationErrorFor(x => x.ReviewDueOn);
        result.ShouldHaveValidationErrorFor(x => x.CpnInvolvementRequired);
        result.ShouldHaveValidationErrorFor(x => x.NhsReferral);
    }

    [Fact]
    public void Rejects_a_goal_without_a_description() =>
        Assert.False(_validator.Validate(
            Command(goals: [new CarePlanGoalInput(null, " ", CarePlanGoalStatus.NotStarted, null, null)])).IsValid);
}

public class CarePlanTests
{
    [Fact]
    public void A_closed_plan_cannot_be_edited()
    {
        var plan = new CarePlan(Guid.NewGuid(), Guid.NewGuid(), new DateOnly(2025, 5, 13), null);
        plan.Close(CarePlanStatus.Superseded, new DateOnly(2025, 6, 1));

        Assert.Throws<InvalidOperationException>(() => plan.Update(
            "Goals", "Support", null, null, null, null, null, false, CarePlanNhsReferral.NotAppropriate));
    }
}

public class CarePlanTextTests
{
    [Fact]
    public void Export_follows_the_care_plan_form()
    {
        var plan = new CarePlanDto(
            Guid.NewGuid(), Guid.NewGuid(), CarePlanStatus.Active,
            "Reducing anxiety around housing.", "Weekly phone contact with CMHW.", "Journalling exercise agreed.",
            "Peer support group — referred 10 May.", "Guest prefers morning calls.",
            new DateOnly(2025, 5, 20), false, CarePlanNhsReferral.NotAppropriate,
            new DateOnly(2025, 5, 13), new DateOnly(2025, 6, 5), null, false, "Patrick Osei",
            DateTimeOffset.UtcNow, DateTimeOffset.UtcNow,
            [new CarePlanGoalDto(Guid.NewGuid(), "Attend one community activity a week", CarePlanGoalStatus.InProgress,
                new DateOnly(2025, 7, 1), "Went to the walking group twice.", 1)]);

        var text = CarePlanText.Build(plan, "Amara Asante", 1042);

        Assert.Contains("Amara Asante (G-1042)", text);
        Assert.Contains("Created 13 May 2025 by Patrick Osei", text);
        Assert.Contains("Reducing anxiety around housing.", text);
        Assert.Contains("Journalling exercise agreed.", text);
        Assert.Contains("Peer support group — referred 10 May.", text);
        Assert.Contains("1. Attend one community activity a week [In progress] — target 01 Jul 2025", text);
        Assert.Contains("Went to the walking group twice.", text);
        Assert.Contains("05 Jun 2025", text);
        Assert.Contains("No — not appropriate", text);
        Assert.Contains("Guest prefers morning calls.", text);
    }
}
