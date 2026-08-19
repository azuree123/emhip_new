namespace Emhip.Domain.Enums;

/// <summary>Referral classification per spec §6.2; Secondary referrals carry a structured subcategory.</summary>
public enum ReferralType
{
    Primary = 0,
    Secondary = 1,
}
