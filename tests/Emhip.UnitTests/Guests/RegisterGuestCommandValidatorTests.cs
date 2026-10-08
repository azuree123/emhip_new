using Emhip.Application.Guests.Commands;
using Emhip.Domain.Enums;
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

    [Fact]
    public void How_did_you_hear_about_us_is_optional()
    {
        _validator.TestValidate(ValidCommand() with { HeardAboutUs = null }).ShouldNotHaveAnyValidationErrors();
        _validator.TestValidate(ValidCommand() with { HeardAboutUs = [] }).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Accepts_several_ticked_sources()
    {
        var command = ValidCommand() with
        {
            HeardAboutUs = [HeardAboutUsSource.Nhs, HeardAboutUsSource.SocialMedia, HeardAboutUsSource.Outreach],
        };
        var result = _validator.TestValidate(command);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Ticking_Other_requires_the_other_text(string? other)
    {
        var command = ValidCommand() with
        {
            HeardAboutUs = [HeardAboutUsSource.Nhs, HeardAboutUsSource.Other],
            HeardAboutUsOther = other,
        };
        var result = _validator.TestValidate(command);
        result.ShouldHaveValidationErrorFor(x => x.HeardAboutUsOther);
    }

    [Fact]
    public void Accepts_Other_with_its_text()
    {
        var command = ValidCommand() with { HeardAboutUs = [HeardAboutUsSource.Other], HeardAboutUsOther = "Leaflet at the mosque" };
        var result = _validator.TestValidate(command);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Rejects_other_text_over_200_characters()
    {
        var command = ValidCommand() with { HeardAboutUs = [HeardAboutUsSource.Other], HeardAboutUsOther = new string('x', 201) };
        var result = _validator.TestValidate(command);
        result.ShouldHaveValidationErrorFor(x => x.HeardAboutUsOther);
    }

    [Fact]
    public void Other_text_is_ignored_when_Other_is_not_ticked()
    {
        // The handler drops it, so neither the length nor anything else blocks registration.
        var command = ValidCommand() with { HeardAboutUs = [HeardAboutUsSource.Nhs], HeardAboutUsOther = new string('x', 500) };
        var result = _validator.TestValidate(command);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Rejects_an_unknown_source()
    {
        var command = ValidCommand() with { HeardAboutUs = [(HeardAboutUsSource)64] };
        var result = _validator.TestValidate(command);
        Assert.Contains(result.Errors, e => e.PropertyName.StartsWith(nameof(RegisterGuestCommand.HeardAboutUs)));
    }
}
