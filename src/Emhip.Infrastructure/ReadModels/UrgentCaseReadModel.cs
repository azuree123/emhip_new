namespace Emhip.Infrastructure.ReadModels;

/// <summary>
/// Denormalized, maintained by Emhip.Workers.EscalationWorker in response to
/// RiskFlagRaisedEvent (via the outbox). Read directly by IUrgentCaseReadService — no join
/// against Guest/RiskAssessment at request time.
/// </summary>
public class UrgentCaseReadModel
{
    public Guid GuestId { get; set; }
    public Guid HubId { get; set; }
    public string GuestName { get; set; } = default!;
    public bool SuicidalIdeation { get; set; }
    public bool SelfHarm { get; set; }
    public bool RiskToOthers { get; set; }
    public bool SevereDeterioration { get; set; }
    public bool SafeguardingConcern { get; set; }
    public Guid? AssignedCmhwId { get; set; }
    public string? AssignedCmhwName { get; set; }
    public DateTimeOffset EscalatedAt { get; set; }
    public bool IsActive { get; set; } = true;
}
