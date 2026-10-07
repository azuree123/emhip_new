namespace Emhip.Domain.Enums;

public enum CarePlanStatus
{
    Active = 0,
    Completed = 1,
    /// <summary>Replaced by a newer plan; kept for the history.</summary>
    Superseded = 2,
}

public enum CarePlanGoalStatus
{
    NotStarted = 0,
    InProgress = 1,
    Achieved = 2,
    Discontinued = 3,
}

/// <summary>"Has a referral to NHS services been made or discussed?" — asked on every care plan.</summary>
public enum CarePlanNhsReferral
{
    /// <summary>No — an NHS referral is not appropriate at the moment.</summary>
    NotAppropriate = 0,
    /// <summary>Talked through with the guest; no referral made yet.</summary>
    Discussed = 1,
    /// <summary>A referral to NHS services has been made.</summary>
    Made = 2,
    /// <summary>Offered, and the guest declined.</summary>
    Declined = 3,
}
