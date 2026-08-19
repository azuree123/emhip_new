using Emhip.Domain.Common;

namespace Emhip.Domain.Entities;

/// <summary>
/// 1—1 with Guest. Backs the "Initial Conversation" registration step / tab — the gate a guest
/// passes through to become Active (spec §4.1–4.2).
/// </summary>
public class InitialConversationRecord : Entity
{
    public Guid GuestId { get; private set; }
    public Guid ConductedByStaffId { get; private set; }
    public DateTimeOffset ConductedAt { get; private set; }

    /// <summary>Terminology per spec §6.7: the old "Outcome" field is the presenting problem.</summary>
    public string? PresentingIssues { get; private set; }

    /// <summary>"Description of problem" — what brought the guest in, in their words.</summary>
    public string? Notes { get; private set; }

    public bool ConsentConfirmed { get; private set; }

    /// <summary>Mandatory Immediate Risk answer (§4.2). True raises the urgent flag automatically (§4.5).</summary>
    public bool ImmediateRisk { get; private set; }

    /// <summary>Mandatory for the pathways that require ongoing one-to-one contact (§4.2).</summary>
    public DateOnly? NextContactDate { get; private set; }

    private InitialConversationRecord() { }

    public InitialConversationRecord(
        Guid guestId, Guid conductedByStaffId, string? presentingIssues, string? notes, bool consentConfirmed,
        bool immediateRisk, DateOnly? nextContactDate)
    {
        GuestId = guestId;
        ConductedByStaffId = conductedByStaffId;
        ConductedAt = DateTimeOffset.UtcNow;
        PresentingIssues = presentingIssues;
        Notes = notes;
        ConsentConfirmed = consentConfirmed;
        ImmediateRisk = immediateRisk;
        NextContactDate = nextContactDate;
    }
}
