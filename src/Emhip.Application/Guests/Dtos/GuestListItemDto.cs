using Emhip.Domain.Enums;

namespace Emhip.Application.Guests.Dtos;

/// <summary>
/// List-view projection only — the Guest Data Sheet screen never receives full Guest
/// entities. See ARCHITECTURE.md "Projection-first reads".
/// </summary>
public sealed record GuestListItemDto(
    Guid Id,
    string FirstName,
    string LastName,
    DateOnly DateOfBirth,
    GuestStatus Status,
    string? AssignedCmhwName,
    DateTimeOffset RegisteredAt,
    DateTimeOffset? LastContactAt,
    string? PathwayCategory,
    bool HasRiskFlags,
    DateOnly? NextContactDue);

/// <summary>Option for the guest list's "Assigned CMHW" filter dropdown.</summary>
public sealed record CmhwOptionDto(Guid Id, string DisplayName);
