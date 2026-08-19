namespace Emhip.Application.Guests.Dtos;

public sealed record PathwayReferralDto(
    Guid Id,
    string Category,
    string? Detail,
    string Status,
    string ReferredByName,
    DateTimeOffset ReferredAt);

/// <summary>
/// The Pathway History tab: the guest's current pathway, the append-only history of pathway
/// changes (what changed, why, who authorised it), and the referrals made along the way.
/// </summary>
public sealed record GuestPathwayDto(
    Guid GuestId,
    Domain.Enums.GuestPathway? CurrentPathway,
    bool AfaSupportNeeded,
    IReadOnlyList<Pathways.PathwayChangeDto> Changes,
    IReadOnlyList<PathwayReferralDto> Referrals);
