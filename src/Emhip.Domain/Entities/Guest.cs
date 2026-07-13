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
        Guid? assignedCmhwId = null)
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
        Status = GuestStatus.PendingConversation;
        AssignedCmhwId = assignedCmhwId;
        RegisteredByStaffId = registeredByStaffId;
        RegisteredAt = DateTimeOffset.UtcNow;

        Raise(new GuestRegisteredEvent(Id, HubId, RegisteredAt));
    }

    public void UpdateStatus(GuestStatus status) => Status = status;

    public void Escalate() => Status = GuestStatus.Urgent;

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
}
