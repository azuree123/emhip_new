using Emhip.Domain.Common;

namespace Emhip.Domain.Entities;

/// <summary>
/// 1—1 with Guest, own table (loaded only by the Demographics tab / Register: Demographics
/// step — never joined into the Guest List projection).
/// </summary>
public class GuestDemographics : Entity
{
    public Guid GuestId { get; private set; }
    public string? Ethnicity { get; private set; }
    public string? Nationality { get; private set; }
    public string? PreferredLanguage { get; private set; }
    public bool InterpreterNeeded { get; private set; }
    public string? HousingStatus { get; private set; }
    public string? EmploymentStatus { get; private set; }

    /// <summary>Spec §6.1 — dropdown-driven demographic fields.</summary>
    public string? MaritalStatus { get; private set; }
    public string? LivingGroup { get; private set; }
    public string? EmergencyContactName { get; private set; }
    public string? EmergencyContactPhone { get; private set; }
    public string? EmergencyContactRelationship { get; private set; }
    public string? GpName { get; private set; }
    public string? GpPractice { get; private set; }
    public string? NhsNumber { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    private GuestDemographics() { }

    public GuestDemographics(Guid guestId)
    {
        GuestId = guestId;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Update(
        string? ethnicity, string? nationality, string? preferredLanguage, bool interpreterNeeded,
        string? housingStatus, string? employmentStatus, string? maritalStatus, string? livingGroup,
        string? emergencyContactName, string? emergencyContactPhone, string? emergencyContactRelationship,
        string? gpName, string? gpPractice, string? nhsNumber)
    {
        Ethnicity = ethnicity;
        Nationality = nationality;
        PreferredLanguage = preferredLanguage;
        InterpreterNeeded = interpreterNeeded;
        HousingStatus = housingStatus;
        EmploymentStatus = employmentStatus;
        MaritalStatus = maritalStatus;
        LivingGroup = livingGroup;
        EmergencyContactName = emergencyContactName;
        EmergencyContactPhone = emergencyContactPhone;
        EmergencyContactRelationship = emergencyContactRelationship;
        GpName = gpName;
        GpPractice = gpPractice;
        NhsNumber = nhsNumber;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
