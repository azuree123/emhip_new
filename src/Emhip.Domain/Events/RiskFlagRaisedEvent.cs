using Emhip.Domain.Common;

namespace Emhip.Domain.Events;

/// <summary>
/// Raised whenever a RiskAssessment is saved with any flag set. Consumed by
/// Emhip.Workers.EscalationWorker to update the Urgent Cases read model and push
/// a SignalR notification — see ARCHITECTURE.md "Escalation worker".
/// </summary>
public sealed record RiskFlagRaisedEvent(
    Guid GuestId,
    Guid RiskAssessmentId,
    bool SuicidalIdeation,
    bool SelfHarm,
    bool RiskToOthers,
    bool SevereDeterioration,
    bool SafeguardingConcern,
    DateTimeOffset OccurredAt) : IDomainEvent;
