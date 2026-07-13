namespace Emhip.Application.FollowUps;

public sealed record FollowUpQueueItemDto(
    Guid Id,
    Guid GuestId,
    string GuestName,
    DateOnly DueDate,
    string Status,
    string AssigneeName,
    bool IsOverdue);
