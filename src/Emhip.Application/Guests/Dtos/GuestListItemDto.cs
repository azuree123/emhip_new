using Emhip.Domain.Enums;

namespace Emhip.Application.Guests.Dtos;

/// <summary>
/// List-view projection only — the Guest Data Sheet screen never receives full Guest
/// entities. See ARCHITECTURE.md "Projection-first reads".
/// </summary>
public sealed record GuestListItemDto(
    Guid Id,
    int GuestNumber,
    string FirstName,
    string LastName,
    DateOnly DateOfBirth,
    GuestStatus Status,
    string? AssignedCmhwName,
    DateTimeOffset RegisteredAt,
    DateTimeOffset? LastContactAt,
    string? PathwayCategory,
    bool HasRiskFlags,
    /// <summary>Temporary safety escalation — independent of status and pathway (spec §3.3).</summary>
    bool IsUrgent,
    DateOnly? NextContactDue);

/// <summary>Option for the guest list's "Assigned CMHW" filter dropdown.</summary>
public sealed record CmhwOptionDto(Guid Id, string DisplayName);

/// <summary>Top-bar search suggestion row.</summary>
public sealed record GuestSuggestionDto(Guid Id, int GuestNumber, string FullName, GuestStatus Status);
