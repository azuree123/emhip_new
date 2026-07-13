namespace Emhip.Application.Guests.Dtos;

public sealed record PathwayReferralDto(
    Guid Id,
    string Category,
    string? Detail,
    string Status,
    string ReferredByName,
    DateTimeOffset ReferredAt);

public sealed record GuestPathwayDto(Guid GuestId, IReadOnlyList<PathwayReferralDto> Referrals);
