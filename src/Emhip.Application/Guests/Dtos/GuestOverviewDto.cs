using Emhip.Domain.Enums;

namespace Emhip.Application.Guests.Dtos;

public sealed record GuestOverviewDto(
    Guid Id,
    string FirstName,
    string LastName,
    DateOnly DateOfBirth,
    GuestStatus Status,
    string? ContactPhone,
    string? ContactEmail,
    string? AssignedCmhwName,
    DateTimeOffset RegisteredAt,
    bool HasActiveRiskFlags,
    int OpenFollowUpCount,
    GuestPathway? Pathway,
    bool AfaSupportNeeded,
    IReadOnlyList<GuestNoteDto> PinnedNotes,
    IReadOnlyList<GuestContactSummaryDto> RecentContacts);

public sealed record GuestNoteDto(Guid Id, string Body, string Color, bool IsPinned, string AuthorName, DateTimeOffset CreatedAt);

public sealed record GuestContactSummaryDto(Guid Id, string Type, string Outcome, DateTimeOffset OccurredAt, string CreatedByName);
