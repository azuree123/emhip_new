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

    /// <summary>
    /// The "Select contact type" chip. Null for a CPN session: the design only offers the
    /// contact-type chips when "Is this a CPN contact?" is off, so forcing a category onto a CPN
    /// note would record a classification the worker never made.
    /// </summary>
    public CaseworkNoteCategory? Category { get; private set; }
    public CaseworkNoteStatus Status { get; private set; }

    /// <summary>The "Is this a CPN contact?" toggle at the top of the Add Contact popup.</summary>
    public bool IsCpnContact { get; private set; }

    /// <summary>
    /// Which CPN form produced this note. Only <see cref="CpnSessionType.FollowUpSession"/> is
    /// ever stored here — Part 1 lives in its own <see cref="CpnInitialAssessment"/> aggregate —
    /// but the value is kept so a note records the session type it was written under.
    /// </summary>
    public CpnSessionType? CpnSessionType { get; private set; }

    /// <summary>"Follow-up session N" in the design header — the note's position in the CPN series.</summary>
    public int? SessionNumber { get; private set; }

    public ContactType ContactMethod { get; private set; }
    public DateTimeOffset OccurredAt { get; private set; }

    // --- SBAR ---
    public string? Situation { get; private set; }
    public string? Background { get; private set; }
    /// <summary>The worker's clinical judgement — required to submit.</summary>
    public string? Assessment { get; private set; }
    public string? Recommendation { get; private set; }

    /// <summary>The "Risk update" answer on the follow-up form.</summary>
    public CaseworkRiskLevel RiskLevel { get; private set; }

    /// <summary>
    /// "Any specific risk factors to note this session" — or, on the New Casework Note, the crisis
    /// action notes (an immediate risk) or the concern note ("Note a concern").
    /// </summary>
    public string? RiskNotes { get; private set; }

    /// <summary>The New Casework Note's single-choice risk assessment; null on Add Contact notes.</summary>
    public CaseworkRiskCheck? RiskCheck { get; private set; }

    /// <summary>The urgent case this note's immediate risk opened or added to on submission.</summary>
    public Guid? UrgentEpisodeId { get; private set; }

    /// <summary>
    /// Existing guest actions the worker ticked off in this session ("Actions arising from this
    /// note"), comma-separated. Kept on the draft so a resumed note re-ticks them; the actions
    /// themselves are only completed when the note is submitted.
    /// </summary>
    public string? CompletedActionIds { get; private set; }

    /// <summary>
    /// The optional AFA section of a casework note: how the advice was given. The advice type is
    /// <see cref="AdviceType"/> and its details <see cref="AdditionalNotes"/>; submitting files a
    /// separate AFA contact, so the advice counts exactly as one logged through the AFA form.
    /// </summary>
    public ContactType? AfaContactMethod { get; private set; }

    // --- Short-form contact types (Activity, Hospitality, AFA) ---
    /// <summary>"Activity *" — the hub activity the guest attended (HubActivity lookup label).</summary>
    public string? ActivityType { get; private set; }

    /// <summary>"Describe the occasion" — free text when the session is not in the activity list.</summary>
    public string? Occasion { get; private set; }

    /// <summary>The AFA "Description" — the type of practical advice or signposting given (AfaAdviceType lookup label).</summary>
    public string? AdviceType { get; private set; }

    /// <summary>"Any changes the guest mentioned since you last spoke?"</summary>
    public string? GuestReportedChanges { get; private set; }

    /// <summary>"Has anything changed with GP, CMHT, social services, or other support?"</summary>
    public string? ServiceInvolvementChanges { get; private set; }

    public string? AdditionalNotes { get; private set; }
    public DateOnly? NextContactDate { get; private set; }

    /// <summary>
    /// The worker ticked "No next contact needed" — the explicit opt-out from the otherwise
    /// mandatory next contact date, kept so the record shows it was a decision, not an omission.
    /// </summary>
    public bool NoNextContactRequired { get; private set; }

    public bool MdtDiscussionRequested { get; private set; }
    public bool CpnReferralRequested { get; private set; }

    /// <summary>The Contact row created when the note was submitted, so it shows in the activity log.</summary>
    public Guid? ContactId { get; private set; }

    public Guid AuthorStaffId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public DateTimeOffset? SubmittedAt { get; private set; }

    private CaseworkNote() { }

    public CaseworkNote(Guid guestId, Guid authorStaffId, CaseworkNoteCategory? category, ContactType contactMethod, DateTimeOffset occurredAt)
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

    /// <summary>
    /// Casework and CPN contacts are full SBAR clinical notes. Activity, Hospitality and AFA are the
    /// design's short forms — no session notes, so no assessment and no next contact date.
    /// </summary>
    public static bool IsClinicalNote(bool isCpnContact, CaseworkNoteCategory? category) =>
        isCpnContact || category is not (CaseworkNoteCategory.Activity or CaseworkNoteCategory.Hospitality or CaseworkNoteCategory.Afa);

    public bool RequiresClinicalNote => IsClinicalNote(IsCpnContact, Category);

    /// <summary>The six criteria that alert the Hub Manager; "None" and "Note a concern" do not.</summary>
    public static bool IsImmediateRisk(CaseworkRiskCheck? check) =>
        check is not (null or CaseworkRiskCheck.NoneApply or CaseworkRiskCheck.NoteConcern);

    /// <summary>
    /// The risk level a risk check implies, so the history chips, Contact History and the MDT
    /// queue read the same answer: an immediate risk is High, a noted concern Medium.
    /// </summary>
    public static CaseworkRiskLevel RiskLevelFor(CaseworkRiskCheck check) => check switch
    {
        CaseworkRiskCheck.NoneApply => CaseworkRiskLevel.NoRiskDetected,
        CaseworkRiskCheck.NoteConcern => CaseworkRiskLevel.Medium,
        _ => CaseworkRiskLevel.High,
    };

    public IReadOnlyList<Guid> CompletedActionIdList() =>
        string.IsNullOrWhiteSpace(CompletedActionIds)
            ? []
            : CompletedActionIds.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(id => Guid.TryParse(id, out var guid) ? guid : Guid.Empty)
                .Where(id => id != Guid.Empty)
                .ToList();

    public void Update(
        CaseworkNoteCategory? category, ContactType contactMethod, DateTimeOffset occurredAt,
        string? situation, string? background, string? assessment, string? recommendation,
        CaseworkRiskLevel riskLevel, string? guestReportedChanges, string? serviceInvolvementChanges,
        string? additionalNotes, DateOnly? nextContactDate, bool mdtDiscussionRequested, bool cpnReferralRequested,
        bool isCpnContact = false, CpnSessionType? cpnSessionType = null, string? riskNotes = null,
        bool noNextContactRequired = false,
        string? activityType = null, string? occasion = null, string? adviceType = null,
        CaseworkRiskCheck? riskCheck = null, ContactType? afaContactMethod = null,
        IReadOnlyCollection<Guid>? completedActionIds = null)
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
        // A risk check answers the risk question outright, so the level follows it.
        RiskLevel = riskCheck is { } check ? RiskLevelFor(check) : riskLevel;
        RiskCheck = riskCheck;
        AfaContactMethod = afaContactMethod;
        CompletedActionIds = completedActionIds is { Count: > 0 } ids ? string.Join(',', ids.Distinct()) : null;
        GuestReportedChanges = guestReportedChanges;
        ServiceInvolvementChanges = serviceInvolvementChanges;
        AdditionalNotes = additionalNotes;
        // Opting out and booking a date contradict each other; the opt-out wins.
        NextContactDate = noNextContactRequired ? null : nextContactDate;
        NoNextContactRequired = noNextContactRequired;
        MdtDiscussionRequested = mdtDiscussionRequested;
        CpnReferralRequested = cpnReferralRequested;
        IsCpnContact = isCpnContact;
        CpnSessionType = cpnSessionType;
        RiskNotes = riskNotes;
        ActivityType = activityType;
        Occasion = occasion;
        AdviceType = adviceType;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    /// <summary>
    /// Stamps "Follow-up session N". Assigned by the handler from the count of submitted CPN
    /// notes already on the guest, so the number matches what the reader sees in the history.
    /// </summary>
    public void SetSessionNumber(int sessionNumber) => SessionNumber = sessionNumber;

    /// <summary>Links the urgent case the note's immediate risk opened or added to.</summary>
    public void LinkUrgentEpisode(Guid urgentEpisodeId) => UrgentEpisodeId = urgentEpisodeId;

    /// <summary>Finalises the note. <paramref name="contactId"/> links the Contact it produced.</summary>
    public void Submit(Guid contactId)
    {
        if (IsSubmitted)
        {
            throw new InvalidOperationException("This casework note has already been submitted.");
        }

        if (RequiresClinicalNote && string.IsNullOrWhiteSpace(Assessment))
        {
            throw new InvalidOperationException("An assessment is required before a casework note can be submitted.");
        }

        // The crisis action notes become the urgent case's intake notes, which may never be empty.
        if (IsImmediateRisk(RiskCheck) && string.IsNullOrWhiteSpace(RiskNotes))
        {
            throw new InvalidOperationException("Crisis action notes are required before a note with an immediate risk can be submitted.");
        }

        Status = CaseworkNoteStatus.Submitted;
        ContactId = contactId;
        SubmittedAt = DateTimeOffset.UtcNow;
        UpdatedAt = SubmittedAt.Value;
    }
}
