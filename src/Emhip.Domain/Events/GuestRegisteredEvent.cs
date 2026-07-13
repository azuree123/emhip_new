using Emhip.Domain.Common;

namespace Emhip.Domain.Events;

public sealed record GuestRegisteredEvent(Guid GuestId, Guid HubId, DateTimeOffset OccurredAt) : IDomainEvent;
