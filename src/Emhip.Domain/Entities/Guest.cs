using Emhip.Domain.Common;
using Emhip.Domain.Enums;
using Emhip.Domain.Events;

namespace Emhip.Domain.Entities;

/// <summary>
/// The Guest aggregate root. Kept intentionally lean — no eager navigation collections to
/// Contacts/Notes/FollowUps/RiskAssessments/etc. Each Guest Workspace tab is its own
/// projection query against its own table (see ARCHITECTURE.md "Projection-first reads").
/// </summary>
public class Guest : AggregateRoot
{
    /// <summary>Sequential human-friendly reference (rendered "G-1001"). DB-generated from the GuestNumbers sequence.</summary>
    public int GuestNumber { get; private set; }

    public Guid HubId { get; private set; }
    public string FirstName { get; private set; } = default!;
    public string LastName { get; private set; } = default!;
    public DateOnly DateOfBirth { get; private set; }
    public string? Gender { get; private set; }
    public string? ContactPhone { get; private set; }
    public string? ContactEmail { get; private set; }
    public string? AddressLine1 { get; private set; }
    public string? AddressLine2 { get; private set; }
    public string? PostCode { get; private set; }
    public bool ConsentGiven { get; private set; }
    public DateTimeOffset? ConsentGivenAt { get; private set; }
    public GuestStatus Status { get; private set; }
    public Guid? AssignedCmhwId { get; private set; }
    public Guid RegisteredByStaffId { get; private set; }
    public DateTimeOffset RegisteredAt { get; private set; }
    public bool IsDeleted { get; private set; }

    /// <summary>Clinical pathway allocated at the register flow's "Pathway &amp; allocation" step; null until allocated.</summary>
    public GuestPathway? Pathway { get; private set; }

    /// <summary>"Practical support / Advice First Aid also needed?" from pathway allocation.</summary>
    public bool AfaSupportNeeded { get; private set; }

    /// <summary>Where the guest was referred from (GP referral, CMHT, Community organisation, Self-referral, …).</summary>
    public string? ReferralSource { get; private set; }

    /// <summary>Primary or Secondary referral (spec §6.2).</summary>
    public ReferralType? ReferralType { get; private set; }

    /// <summary>Structured subcategory, required by the spec for Secondary referrals.</summary>
    public string? ReferralSubcategory { get; private set; }

    /// <summary>
    /// Urgent Support (spec §3.3) — a temporary escalation state that sits alongside pathway and
    /// engagement status rather than replacing either.
    /// </summary>
    public bool IsUrgent { get; private set; }
    public DateTimeOffset? UrgentSince { get; private set; }

    /// <summary>
    /// Denormalised last activity timestamp driving the automatic On Hold sweep (§4.7). Kept on
    /// the guest so the sweep is an indexed scan rather than a per-guest max over Contacts.
    /// </summary>
    public DateTimeOffset? LastActivityAt { get; private set; }

    private Guest() { }

    public Guest(
        Guid hubId,
        string firstName,
        string lastName,
        DateOnly dateOfBirth,
        Guid registeredByStaffId,
        bool consentGiven,
        string? gender = null,
        string? contactPhone = null,
        string? contactEmail = null,
        string? addressLine1 = null,
        string? addressLine2 = null,
        string? postCode = null,
        Guid? assignedCmhwId = null,
        string? referralSource = null)
    {
        HubId = hubId;
        FirstName = firstName;
        LastName = lastName;
        DateOfBirth = dateOfBirth;
        Gender = gender;
        ContactPhone = contactPhone;
        ContactEmail = contactEmail;
        AddressLine1 = addressLine1;
        AddressLine2 = addressLine2;
        PostCode = postCode;
        ConsentGiven = consentGiven;
        ConsentGivenAt = consentGiven ? DateTimeOffset.UtcNow : null;
        Status = GuestStatus.New;
        AssignedCmhwId = assignedCmhwId;
        ReferralSource = referralSource;
        RegisteredByStaffId = registeredByStaffId;
        RegisteredAt = DateTimeOffset.UtcNow;

        Raise(new GuestRegisteredEvent(Id, HubId, RegisteredAt));
    }

    public void UpdateStatus(GuestStatus status) => Status = status;

    /// <summary>
    /// New → Active. The spec (§4.1) allows this only once the initial conversation is done, so
    /// the command that records it is the only caller.
    /// </summary>
    public void ActivateAfterInitialConversation(DateTimeOffset completedAt)
    {
        Status = GuestStatus.Active;
        RecordActivity(completedAt);
    }

    /// <summary>Raises the urgent flag without touching engagement status (§3.3).</summary>
    public void Escalate()
    {
        if (IsUrgent) return;
        IsUrgent = true;
        UrgentSince = DateTimeOffset.UtcNow;
    }

    /// <summary>
    /// Stamps the last activity date (§4.6) and brings an On Hold guest back to Active — contact
    /// is exactly what "on hold" was waiting for.
    /// </summary>
    public void RecordActivity(DateTimeOffset occurredAt)
    {
        if (LastActivityAt is null || occurredAt > LastActivityAt) LastActivityAt = occurredAt;
        if (Status == GuestStatus.OnHold) Status = GuestStatus.Active;
    }

    /// <summary>Automatic transition run by the engagement-status sweep (§4.7).</summary>
    public void PlaceOnHold()
    {
        if (Status == GuestStatus.Active) Status = GuestStatus.OnHold;
    }

    public void SetReferral(ReferralType? referralType, string? subcategory, string? source)
    {
        ReferralType = referralType;
        ReferralSubcategory = subcategory;
        ReferralSource = source;
    }

    /// <summary>Reference from the system this guest was migrated out of, so a re-run updates rather than duplicates (§7).</summary>
    public string? LegacyReference { get; private set; }

    public void SetLegacyReference(string? legacyReference)
    {
        if (!string.IsNullOrWhiteSpace(legacyReference)) LegacyReference = legacyReference;
    }

    /// <summary>Migration only — preserves the original registration timestamp (§7.2).</summary>
    public void OverwriteRegisteredAt(DateTimeOffset registeredAt) => RegisteredAt = registeredAt;

    public void SoftDelete() => IsDeleted = true;

    public void UpdateContactDetails(string? phone, string? email, string? addressLine1, string? addressLine2, string? postCode)
    {
        ContactPhone = phone;
        ContactEmail = email;
        AddressLine1 = addressLine1;
        AddressLine2 = addressLine2;
        PostCode = postCode;
    }

    public void Reassign(Guid? cmhwId) => AssignedCmhwId = cmhwId;

    public void Allocate(GuestPathway pathway, bool afaSupportNeeded)
    {
        Pathway = pathway;
        AfaSupportNeeded = afaSupportNeeded;
    }

    /// <summary>
    /// Clears the urgent flag. Engagement status is deliberately untouched — a guest who was New
    /// or On Hold before the escalation returns to exactly that state.
    /// </summary>
    public void ResolveUrgent()
    {
        IsUrgent = false;
        UrgentSince = null;
        Raise(new UrgentCaseResolvedEvent(Id, DateTimeOffset.UtcNow));
    }
}
