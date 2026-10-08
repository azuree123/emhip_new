namespace Emhip.Domain.Enums;

/// <summary>
/// "How did you hear about us?" on the first registration step. A tickbox list, so a guest can
/// give several answers — stored as one bit mask on the guest.
/// </summary>
[Flags]
public enum HeardAboutUsSource
{
    None = 0,
    Nhs = 1,
    OtherStatutoryServices = 2,
    SocialMedia = 4,
    Outreach = 8,
    /// <summary>Described in <c>Guest.HeardAboutUsOther</c>.</summary>
    Other = 16,
}
