using Emhip.Application.Guests.Commands;
using FluentValidation.TestHelper;
using Xunit;

namespace Emhip.UnitTests.Guests;

public class RegisterGuestCommandValidatorTests
{
    private readonly RegisterGuestCommandValidator _validator = new();

    private static RegisterGuestCommand ValidCommand() => new(
        FirstName: "Jamie", LastName: "Rivera", DateOfBirth: new DateOnly(1990, 1, 1),
        ConsentGiven: true, Gender: null, ContactPhone: null, ContactEmail: null,
        AddressLine1: null, AddressLine2: null, PostCode: null, AssignedCmhwId: null);

    [Fact]
    public void Rejects_missing_consent()
    {
        var command = ValidCommand() with { ConsentGiven = false };
        var result = _validator.TestValidate(command);
        result.ShouldHaveValidationErrorFor(x => x.ConsentGiven);
    }

    [Fact]
    public void Rejects_future_date_of_birth()
    {
        var command = ValidCommand() with { DateOfBirth = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)) };
        var result = _validator.TestValidate(command);
        result.ShouldHaveValidationErrorFor(x => x.DateOfBirth);
    }

    [Fact]
    public void Rejects_malformed_email()
    {
        var command = ValidCommand() with { ContactEmail = "not-an-email" };
        var result = _validator.TestValidate(command);
        result.ShouldHaveValidationErrorFor(x => x.ContactEmail);
    }

    [Fact]
    public void Accepts_a_valid_command()
    {
        var result = _validator.TestValidate(ValidCommand());
        result.ShouldNotHaveAnyValidationErrors();
    }
}
