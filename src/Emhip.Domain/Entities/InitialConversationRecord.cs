using Emhip.Domain.Common;

namespace Emhip.Domain.Entities;

/// <summary>1—1 with Guest. Backs the "Initial Conversation" registration step / tab.</summary>
public class InitialConversationRecord : Entity
{
    public Guid GuestId { get; private set; }
    public Guid ConductedByStaffId { get; private set; }
    public DateTimeOffset ConductedAt { get; private set; }
    public string? PresentingIssues { get; private set; }
    public string? Notes { get; private set; }
    public bool ConsentConfirmed { get; private set; }

    private InitialConversationRecord() { }

    public InitialConversationRecord(Guid guestId, Guid conductedByStaffId, string? presentingIssues, string? notes, bool consentConfirmed)
    {
        GuestId = guestId;
        ConductedByStaffId = conductedByStaffId;
        ConductedAt = DateTimeOffset.UtcNow;
        PresentingIssues = presentingIssues;
        Notes = notes;
        ConsentConfirmed = consentConfirmed;
    }
}
