namespace Emhip.Domain.Enums;

/// <summary>
/// The badge on an MDT queue row (design: "Different badges assign (MDT + CPN) … Manager will
/// perform action depending upon each badge").
/// </summary>
public enum MdtQueueKind
{
    /// <summary>"Refer this guest to the CPN" on a casework note — confirmed or declined by the Hub Manager.</summary>
    CpnReferral = 0,
    /// <summary>A new intake that needs the team's eyes (immediate risk, or the clinical pathway).</summary>
    InitialReview = 1,
    /// <summary>"Add this guest for MDT discussion" on a casework note.</summary>
    DiscussionRequest = 2,
}

public enum MdtQueueStatus
{
    Pending = 0,
    /// <summary>CPN referral confirmed — the CPN is allocated and CPN activity is tracked from here.</summary>
    Confirmed = 1,
    /// <summary>Declined with a documented reason; the guest stays on CMHW-only support.</summary>
    Declined = 2,
    /// <summary>Discussion / initial review marked as discussed by the team.</summary>
    Discussed = 3,
}
