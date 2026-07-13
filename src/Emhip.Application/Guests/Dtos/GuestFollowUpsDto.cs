namespace Emhip.Application.Guests.Dtos;

public sealed record FollowUpItemDto(
    Guid Id,
    DateOnly DueDate,
    string Status,
    string AssigneeName,
    string? Notes,
    DateTimeOffset? CompletedAt);

public sealed record GuestFollowUpsDto(Guid GuestId, IReadOnlyList<FollowUpItemDto> FollowUps);
