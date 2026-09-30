using Emhip.Domain.Enums;

namespace Emhip.Application.Guests;

/// <summary>
/// The three clinical pathways by the names the service uses everywhere — screens, exports,
/// emails and episode records. They are the only pathways; the client mirrors these labels in
/// core/demographic-options.ts (CLINICAL_PATHWAY_OPTIONS).
/// </summary>
public static class GuestPathwayLabels
{
    public static string For(GuestPathway? pathway) => pathway switch
    {
        GuestPathway.MentalWellbeing => "Mental Wellbeing",
        GuestPathway.ClinicalSupport => "Clinical Support",
        GuestPathway.CommunityRecovery => "Community Recovery",
        _ => "Not allocated",
    };

    /// <summary>For values that arrive as the enum name, e.g. "ClinicalSupport".</summary>
    public static string For(string? pathway) =>
        Enum.TryParse<GuestPathway>(pathway, out var parsed) ? For(parsed) : pathway ?? "Not allocated";
}
