using Emhip.Domain.Entities;

namespace Emhip.UnitTests.Domain;

public class GuestAnonymisationTests
{
    [Fact]
    public void Anonymise_strips_every_direct_identifier_but_keeps_the_pseudonymous_record()
    {
        var guest = new Guest(
            Guid.NewGuid(), "Joyce", "Acheampong", new DateOnly(1971, 6, 14), Guid.NewGuid(), consentGiven: true,
            gender: "Female", contactPhone: "07700 900123", contactEmail: "joyce@example.org",
            addressLine1: "1 High Street", addressLine2: "Flat 2", postCode: "SE1 1AA");
        guest.SetLegacyReference("LEGACY-42");
        guest.SetHeardAboutUs(Emhip.Domain.Enums.HeardAboutUsSource.Other, "My neighbour, Mrs Owusu");

        guest.Anonymise();

        Assert.Equal("Anonymised", guest.FirstName);
        Assert.StartsWith("Guest", guest.LastName);
        Assert.Equal(new DateOnly(1971, 1, 1), guest.DateOfBirth);
        Assert.Null(guest.Gender);
        Assert.Null(guest.ContactPhone);
        Assert.Null(guest.ContactEmail);
        Assert.Null(guest.AddressLine1);
        Assert.Null(guest.AddressLine2);
        Assert.Null(guest.PostCode);
        Assert.Null(guest.LegacyReference);
        Assert.Null(guest.HeardAboutUsOther);
        Assert.Equal(Emhip.Domain.Enums.HeardAboutUsSource.Other, guest.HeardAboutUs); // still counted in the reports
        Assert.True(guest.IsAnonymised);
        Assert.NotNull(guest.AnonymisedAt);
        Assert.True(guest.IsDeleted);
        // Consent history and status are part of the accountability record and are kept.
        Assert.True(guest.ConsentGiven);
    }

    [Fact]
    public void Demographics_anonymisation_clears_identifiers_and_keeps_reporting_categories()
    {
        var demographics = new GuestDemographics(Guid.NewGuid());
        demographics.Update(
            "Black African", "British", "English", false, "Renting", "Employed", "Single", "Lives alone", "Ghana",
            "Ama Mensah", "07700 900456", "Daughter", "Dr Patel", "Riverside Practice", "943 476 5919");

        demographics.Anonymise();

        Assert.Null(demographics.NhsNumber);
        Assert.Null(demographics.GpName);
        Assert.Null(demographics.GpPractice);
        Assert.Null(demographics.EmergencyContactName);
        Assert.Null(demographics.EmergencyContactPhone);
        Assert.Null(demographics.EmergencyContactRelationship);
        Assert.Equal("Black African", demographics.Ethnicity);
        Assert.Equal("Renting", demographics.HousingStatus);
    }
}
