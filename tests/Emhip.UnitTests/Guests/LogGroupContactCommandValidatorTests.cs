using Emhip.Application.Guests.Casework;
using Emhip.Domain.Enums;
using FluentValidation.TestHelper;
using Xunit;

namespace Emhip.UnitTests.Guests;

public class LogGroupContactCommandValidatorTests
{
    private readonly LogGroupContactCommandValidator _validator = new();

    private static LogGroupContactCommand Command(
        CaseworkNoteCategory category = CaseworkNoteCategory.Activity,
        IReadOnlyList<GroupContactAttendee>? attendees = null,
        string? activityType = "Art group",
        string? occasion = null,
        DateTimeOffset? occurredAt = null) => new(
        category,
        occurredAt ?? DateTimeOffset.UtcNow,
        attendees ?? [new(Guid.NewGuid()), new(Guid.NewGuid(), HighRisk: true)],
        activityType,
        occasion,
        Notes: null);

    [Fact]
    public void Accepts_an_activity_for_several_guests()
    {
        _validator.TestValidate(Command()).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Accepts_a_hospitality_session_without_an_activity()
    {
        _validator.TestValidate(Command(CaseworkNoteCategory.Hospitality, activityType: null)).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void An_activity_needs_the_activity_or_the_occasion()
    {
        _validator.TestValidate(Command(activityType: null)).ShouldHaveValidationErrorFor(x => x.ActivityType);
        _validator.TestValidate(Command(activityType: null, occasion: "Wednesday community lunch")).ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData(CaseworkNoteCategory.Casework)]
    [InlineData(CaseworkNoteCategory.Afa)]
    public void Only_activity_and_hospitality_can_be_logged_for_a_group(CaseworkNoteCategory category)
    {
        _validator.TestValidate(Command(category)).ShouldHaveValidationErrorFor(x => x.Category);
    }

    [Fact]
    public void Rejects_a_group_with_no_guests()
    {
        _validator.TestValidate(Command(attendees: [])).ShouldHaveValidationErrorFor(x => x.Attendees);
    }

    [Fact]
    public void Rejects_the_same_guest_twice()
    {
        var guest = Guid.NewGuid();
        _validator.TestValidate(Command(attendees: [new(guest), new(guest)])).ShouldHaveValidationErrorFor(x => x.Attendees);
    }

    [Fact]
    public void Rejects_a_group_over_the_limit()
    {
        var attendees = Enumerable.Range(0, LogGroupContactCommandValidator.MaxAttendees + 1)
            .Select(_ => new GroupContactAttendee(Guid.NewGuid()))
            .ToList();
        _validator.TestValidate(Command(attendees: attendees)).ShouldHaveValidationErrorFor(x => x.Attendees.Count);
    }

    [Fact]
    public void Rejects_a_session_in_the_future()
    {
        _validator.TestValidate(Command(occurredAt: DateTimeOffset.UtcNow.AddDays(1))).ShouldHaveValidationErrorFor(x => x.OccurredAt);
    }
}
