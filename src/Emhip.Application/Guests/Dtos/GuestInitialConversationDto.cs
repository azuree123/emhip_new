namespace Emhip.Application.Guests.Dtos;

/// <summary>
/// The completed initial conversation, including the mandatory answers the spec (§4.2) requires,
/// so the workspace can show what was actually agreed rather than just the free text.
/// </summary>
public sealed record GuestInitialConversationDto(
    Guid GuestId,
    string? PresentingIssues,
    string? Notes,
    bool ConsentConfirmed,
    bool ImmediateRisk,
    DateOnly? NextContactDate,
    /// <summary>The pathway the guest is on now — classified at this conversation.</summary>
    Domain.Enums.GuestPathway? Pathway,
    bool AfaSupportNeeded,
    string? AssignedCmhwName,
    string ConductedByName,
    DateTimeOffset ConductedAt);
