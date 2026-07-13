namespace Emhip.Application.UrgentCases;

/// <summary>Served from the Urgent Cases read model, pushed live over SignalR on escalation.</summary>
public sealed record UrgentCaseDto(
    Guid GuestId,
    string GuestName,
    bool SuicidalIdeation,
    bool SelfHarm,
    bool RiskToOthers,
    bool SevereDeterioration,
    bool SafeguardingConcern,
    string? AssignedCmhwName,
    DateTimeOffset EscalatedAt);
