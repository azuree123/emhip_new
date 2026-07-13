using Emhip.Domain.Common;

namespace Emhip.Domain.Events;

public sealed record FollowUpScheduledEvent(Guid GuestId, Guid FollowUpId, DateOnly DueDate, DateTimeOffset OccurredAt) : IDomainEvent;
