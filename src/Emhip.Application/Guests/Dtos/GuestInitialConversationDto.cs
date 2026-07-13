namespace Emhip.Application.Guests.Dtos;

public sealed record GuestInitialConversationDto(
    Guid GuestId,
    string? PresentingIssues,
    string? Notes,
    bool ConsentConfirmed,
    string ConductedByName,
    DateTimeOffset ConductedAt);
