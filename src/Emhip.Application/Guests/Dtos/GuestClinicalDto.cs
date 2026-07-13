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
    DateTimeOffset AssessedAt);

public sealed record GuestClinicalDto(Guid GuestId, IReadOnlyList<RiskAssessmentDto> History);
