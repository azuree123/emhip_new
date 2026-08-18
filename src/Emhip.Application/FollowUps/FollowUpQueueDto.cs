namespace Emhip.Application.FollowUps;

public sealed record FollowUpQueueItemDto(
    Guid Id,
    Guid GuestId,
    string GuestName,
    int GuestNumber,
    DateOnly DueDate,
    string Status,
    string AssigneeName,
    bool IsOverdue);
