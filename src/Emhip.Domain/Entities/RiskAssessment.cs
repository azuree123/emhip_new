using Emhip.Domain.Common;
using Emhip.Domain.Events;

namespace Emhip.Domain.Entities;

/// <summary>
/// Append-only, versioned per guest (never updated in place — a new row is inserted for
/// every reassessment so the clinical history is preserved). Raising any flag escalates
/// the guest onto the Urgent Cases queue via the outbox/escalation worker.
/// </summary>
public class RiskAssessment : Entity, IHasDomainEvents
{
    public Guid GuestId { get; private set; }
    public int Version { get; private set; }
    public bool SuicidalIdeation { get; private set; }
    public bool SelfHarm { get; private set; }
    public bool RiskToOthers { get; private set; }
    public bool SevereDeterioration { get; private set; }
    public bool SafeguardingConcern { get; private set; }
    public string? Notes { get; private set; }
    public Guid AssessedByStaffId { get; private set; }
    public DateTimeOffset AssessedAt { get; private set; }

    public bool HasAnyFlag => SuicidalIdeation || SelfHarm || RiskToOthers || SevereDeterioration || SafeguardingConcern;

    private readonly List<IDomainEvent> _events = [];
    public IReadOnlyCollection<IDomainEvent> DomainEvents => _events.AsReadOnly();

    private RiskAssessment() { }

    public RiskAssessment(
        Guid guestId, int version, Guid assessedByStaffId,
        bool suicidalIdeation, bool selfHarm, bool riskToOthers, bool severeDeterioration, bool safeguardingConcern,
        string? notes)
    {
        GuestId = guestId;
        Version = version;
        AssessedByStaffId = assessedByStaffId;
        SuicidalIdeation = suicidalIdeation;
        SelfHarm = selfHarm;
        RiskToOthers = riskToOthers;
        SevereDeterioration = severeDeterioration;
        SafeguardingConcern = safeguardingConcern;
        Notes = notes;
        AssessedAt = DateTimeOffset.UtcNow;

        if (HasAnyFlag)
        {
            _events.Add(new RiskFlagRaisedEvent(GuestId, Id, SuicidalIdeation, SelfHarm, RiskToOthers, SevereDeterioration, SafeguardingConcern, AssessedAt));
        }
    }

    public void ClearDomainEvents() => _events.Clear();
}
