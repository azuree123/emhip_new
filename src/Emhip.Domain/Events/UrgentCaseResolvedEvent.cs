using Emhip.Domain.Common;

namespace Emhip.Domain.Events;

/// <summary>
/// Raised when a guest's urgent episode is resolved. Consumed by
/// Emhip.Workers.EscalationWorker to deactivate the Urgent Cases read-model row and push a
/// SignalR "urgentCaseResolved" notification.
/// </summary>
public sealed record UrgentCaseResolvedEvent(Guid GuestId, DateTimeOffset OccurredAt) : IDomainEvent;
