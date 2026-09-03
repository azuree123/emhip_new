using Emhip.Domain.Enums;

namespace Emhip.Application.Mdt;

/// <summary>One MDT queue row (design Frame 54) — the guest, the badge, why it was raised, and how it was resolved.</summary>
public sealed record MdtQueueItemDto(
    Guid Id,
    Guid GuestId,
    int GuestNumber,
    string GuestName,
    string GuestStatus,
    GuestPathway? Pathway,
    string? AssignedCmhwName,
    MdtQueueKind Kind,
    MdtQueueStatus Status,
    string Reason,
    string? Details,
    string? Urgency,
    string RequestedByName,
    DateTimeOffset RequestedAt,
    string? ReviewedByName,
    DateTimeOffset? ReviewedAt,
    string? ReviewNote,
    string? AssignedCpnName,
    string? DeclineReason);

/// <summary>The queue: pending items (oldest first) and the most recently reviewed ones.</summary>
public sealed record MdtQueueDto(IReadOnlyList<MdtQueueItemDto> Pending, IReadOnlyList<MdtQueueItemDto> Reviewed);

/// <summary>The guest workspace "CPN Record" tab.</summary>
public sealed record GuestCpnRecordDto(
    /// <summary>The most recent CPN referral for the guest (pending, confirmed or declined), or null.</summary>
    MdtQueueItemDto? Referral,
    bool CpnInvolved,
    string? AssignedCpnName,
    bool HasInitialAssessment,
    DateTimeOffset? FirstCpnContactAt,
    IReadOnlyList<CpnSessionSummaryDto> Sessions);

/// <summary>One CPN contact on the guest's record — a submitted CPN casework note.</summary>
public sealed record CpnSessionSummaryDto(
    Guid NoteId,
    DateTimeOffset OccurredAt,
    string ContactMethod,
    CpnSessionType? SessionType,
    int? SessionNumber,
    string AuthorName,
    string RiskLevel,
    string? Assessment);
