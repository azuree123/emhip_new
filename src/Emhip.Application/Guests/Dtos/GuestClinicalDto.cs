namespace Emhip.Application.Guests.Dtos;

public sealed record RiskAssessmentDto(
    Guid Id,
    int Version,
    bool SuicidalIdeation,
    bool SelfHarm,
    bool RiskToOthers,
    bool SevereDeterioration,
    bool SafeguardingConcern,
    string? Notes,
    string AssessedByName,
    DateTimeOffset AssessedAt,
    bool OtherRisk = false,
    string? OtherRiskDetails = null);

public sealed record GuestClinicalDto(Guid GuestId, IReadOnlyList<RiskAssessmentDto> History);
