using Emhip.Domain.Common;

namespace Emhip.Domain.Entities;

/// <summary>
/// 1—1 with Guest: the structured clinical picture shown on the workspace Clinical Details
/// tab (mental-health history, medication, service involvement, risk &amp; complexity
/// indicators). Created lazily on first save, like <see cref="GuestDemographics"/> — most
/// fields are seeded from the initial conversation and refined by clinicians afterwards.
/// </summary>
public class GuestClinicalProfile : Entity
{
    public Guid GuestId { get; private set; }

    // Mental health history
    public bool PreviousMhDiagnosis { get; private set; }
    /// <summary>Comma-separated diagnosis group names selected at intake ("select all that apply").</summary>
    public string? DiagnosisGroups { get; private set; }
    public string? PresentingProblem { get; private set; }
    public string? PastMhDifficulties { get; private set; }
    public string? FamilyMhHistory { get; private set; }

    // Physical health / medication
    public string? LongTermHealthCondition { get; private set; }
    public string? PhysicalIllness { get; private set; }
    public string? CurrentMedications { get; private set; }

    // Current service involvement
    public string? MhTeamClinician { get; private set; }
    public string? SocialServicesCoordinator { get; private set; }
    public bool CpnInvolved { get; private set; }
    public bool TrustInvolvement { get; private set; }

    // Risk & complexity
    public bool SmiIndicator { get; private set; }

    public DateTimeOffset UpdatedAt { get; private set; }

    private GuestClinicalProfile() { }

    public GuestClinicalProfile(Guid guestId)
    {
        GuestId = guestId;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Update(
        bool previousMhDiagnosis, string? diagnosisGroups, string? presentingProblem,
        string? pastMhDifficulties, string? familyMhHistory,
        string? longTermHealthCondition, string? physicalIllness, string? currentMedications,
        string? mhTeamClinician, string? socialServicesCoordinator, bool cpnInvolved, bool trustInvolvement,
        bool smiIndicator)
    {
        PreviousMhDiagnosis = previousMhDiagnosis;
        DiagnosisGroups = diagnosisGroups;
        PresentingProblem = presentingProblem;
        PastMhDifficulties = pastMhDifficulties;
        FamilyMhHistory = familyMhHistory;
        LongTermHealthCondition = longTermHealthCondition;
        PhysicalIllness = physicalIllness;
        CurrentMedications = currentMedications;
        MhTeamClinician = mhTeamClinician;
        SocialServicesCoordinator = socialServicesCoordinator;
        CpnInvolved = cpnInvolved;
        TrustInvolvement = trustInvolvement;
        SmiIndicator = smiIndicator;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
