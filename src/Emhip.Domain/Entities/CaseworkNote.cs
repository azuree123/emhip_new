using Emhip.Domain.Common;
using Emhip.Domain.Enums;

namespace Emhip.Domain.Entities;

/// <summary>
/// A clinical casework note, structured as SBAR (Situation, Background, Assessment,
/// Recommendation) — the record a worker writes after seeing a guest.
///
/// Notes start as drafts so a long note survives an interruption, and only a submitted note
/// counts as a contact: submission is what stamps <see cref="SubmittedAt"/> and lets the caller
/// create the linked Contact, actions and follow-up. Submitted notes are never edited — the
/// clinical record is append-only — which is why <see cref="Update"/> refuses once submitted.
/// </summary>
public class CaseworkNote : AggregateRoot
{
    public Guid GuestId { get; private set; }
    public CaseworkNoteCategory Category { get; private set; }
    public CaseworkNoteStatus Status { get; private set; }

    public ContactType ContactMethod { get; private set; }
    public DateTimeOffset OccurredAt { get; private set; }

    // --- SBAR ---
    public string? Situation { get; private set; }
    public string? Background { get; private set; }
    /// <summary>The worker's clinical judgement — required to submit.</summary>
    public string? Assessment { get; private set; }
    public string? Recommendation { get; private set; }

    public CaseworkRiskLevel RiskLevel { get; private set; }

    /// <summary>"Any changes the guest mentioned since you last spoke?"</summary>
    public string? GuestReportedChanges { get; private set; }

    /// <summary>"Has anything changed with GP, CMHT, social services, or other support?"</summary>
    public string? ServiceInvolvementChanges { get; private set; }

    public string? AdditionalNotes { get; private set; }
    public DateOnly? NextContactDate { get; private set; }

    public bool MdtDiscussionRequested { get; private set; }
    public bool CpnReferralRequested { get; private set; }

    /// <summary>The Contact row created when the note was submitted, so it shows in the activity log.</summary>
    public Guid? ContactId { get; private set; }

    public Guid AuthorStaffId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public DateTimeOffset? SubmittedAt { get; private set; }

    private CaseworkNote() { }

    public CaseworkNote(Guid guestId, Guid authorStaffId, CaseworkNoteCategory category, ContactType contactMethod, DateTimeOffset occurredAt)
    {
        GuestId = guestId;
        AuthorStaffId = authorStaffId;
        Category = category;
        ContactMethod = contactMethod;
        OccurredAt = occurredAt;
        Status = CaseworkNoteStatus.Draft;
        RiskLevel = CaseworkRiskLevel.NoRiskDetected;
        CreatedAt = DateTimeOffset.UtcNow;
        UpdatedAt = CreatedAt;
    }

    public bool IsSubmitted => Status == CaseworkNoteStatus.Submitted;

    public void Update(
        CaseworkNoteCategory category, ContactType contactMethod, DateTimeOffset occurredAt,
        string? situation, string? background, string? assessment, string? recommendation,
        CaseworkRiskLevel riskLevel, string? guestReportedChanges, string? serviceInvolvementChanges,
        string? additionalNotes, DateOnly? nextContactDate, bool mdtDiscussionRequested, bool cpnReferralRequested)
    {
        if (IsSubmitted)
        {
            throw new InvalidOperationException("A submitted casework note cannot be edited.");
        }

        Category = category;
        ContactMethod = contactMethod;
        OccurredAt = occurredAt;
        Situation = situation;
        Background = background;
        Assessment = assessment;
        Recommendation = recommendation;
        RiskLevel = riskLevel;
        GuestReportedChanges = guestReportedChanges;
        ServiceInvolvementChanges = serviceInvolvementChanges;
        AdditionalNotes = additionalNotes;
        NextContactDate = nextContactDate;
        MdtDiscussionRequested = mdtDiscussionRequested;
        CpnReferralRequested = cpnReferralRequested;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    /// <summary>Finalises the note. <paramref name="contactId"/> links the Contact it produced.</summary>
    public void Submit(Guid contactId)
    {
        if (IsSubmitted)
        {
            throw new InvalidOperationException("This casework note has already been submitted.");
        }

        if (string.IsNullOrWhiteSpace(Assessment))
        {
            throw new InvalidOperationException("An assessment is required before a casework note can be submitted.");
        }

        Status = CaseworkNoteStatus.Submitted;
        ContactId = contactId;
        SubmittedAt = DateTimeOffset.UtcNow;
        UpdatedAt = SubmittedAt.Value;
    }
}
