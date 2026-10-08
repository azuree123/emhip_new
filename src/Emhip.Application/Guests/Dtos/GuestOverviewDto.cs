using Emhip.Domain.Enums;

namespace Emhip.Application.Guests.Dtos;

public sealed record GuestOverviewDto(
    Guid Id,
    int GuestNumber,
    string FirstName,
    string LastName,
    DateOnly DateOfBirth,
    GuestStatus Status,
    string? ContactPhone,
    string? ContactEmail,
    string? AddressLine1,
    string? PostCode,
    string? AssignedCmhwName,
    DateTimeOffset RegisteredAt,
    bool HasActiveRiskFlags,
    int OpenFollowUpCount,
    GuestPathway? Pathway,
    bool AfaSupportNeeded,
    string? ReferralSource,
    IReadOnlyList<GuestNoteDto> PinnedNotes,
    IReadOnlyList<GuestContactSummaryDto> RecentContacts,
    // The workspace header's Urgent badge ("since …"), its "Last activity" line and the
    // Overview's "Days since last activity" tile, plus the referral detail shown on Demographics.
    bool IsUrgent = false,
    DateTimeOffset? UrgentSince = null,
    DateTimeOffset? LastActivityAt = null,
    ReferralType? ReferralType = null,
    string? ReferralSubcategory = null,
    /// <summary>"How did you hear about us?" — the ticked boxes in form order; empty when unanswered.</summary>
    IReadOnlyList<HeardAboutUsSource>? HeardAboutUs = null,
    string? HeardAboutUsOther = null);

public sealed record GuestNoteDto(Guid Id, string Body, string Color, bool IsPinned, string AuthorName, DateTimeOffset CreatedAt);

/// <summary>
/// One logged contact. <c>Type</c> is the contact method (PhoneCall, InPerson, …); <c>Category</c>
/// is the contact type the worker chose on Add Contact (Casework, Activity, Hospitality, Afa, …) —
/// null for CPN contacts (<c>IsCpnContact</c>) and for contacts with no type recorded.
/// <c>Detail</c> is the short qualifier: the activity, the AFA advice, or the CPN session.
/// </summary>
public sealed record GuestContactSummaryDto(
    Guid Id, string Type, string Outcome, DateTimeOffset OccurredAt, string CreatedByName,
    string? Category = null, bool IsCpnContact = false, string? Detail = null);
