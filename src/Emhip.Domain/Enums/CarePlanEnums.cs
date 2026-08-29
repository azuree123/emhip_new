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
