namespace Emhip.Domain.Enums;

/// <summary>
/// The clinical pathway a guest is allocated to at registration ("Pathway &amp; allocation"
/// step / MDT recommendation). Distinct from <see cref="PathwayCategory"/>, which classifies
/// practical Advice-First-Aid referrals — a guest on any clinical pathway may additionally
/// have AFA support (see Guest.AfaSupportNeeded).
/// </summary>
public enum GuestPathway
{
    /// <summary>Early intervention and general wellbeing support.</summary>
    MentalWellbeing = 0,

    /// <summary>Intense support for complex mental health needs.</summary>
    ClinicalSupport = 1,

    /// <summary>Community-focused recovery and group support.</summary>
    CommunityRecovery = 2,
}
