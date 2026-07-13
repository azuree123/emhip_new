namespace Emhip.Domain.Common;

/// <summary>Implemented by any entity that can raise domain events, not only aggregate roots (e.g. RiskAssessment, FollowUp).</summary>
public interface IHasDomainEvents
{
    IReadOnlyCollection<IDomainEvent> DomainEvents { get; }
    void ClearDomainEvents();
}
