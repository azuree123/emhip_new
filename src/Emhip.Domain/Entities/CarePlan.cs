using Emhip.Domain.Common;
using Emhip.Domain.Enums;

namespace Emhip.Domain.Entities;

/// <summary>
/// The guest's care plan: what the support is trying to achieve, the goals it breaks down into,
/// and when it is next due for review. One plan per guest at a time — superseding a plan closes
/// the old one rather than editing it, so the history of what was agreed stays intact.
/// </summary>
public class CarePlan : AggregateRoot
{
    public Guid GuestId { get; private set; }
    public CarePlanStatus Status { get; private set; }

    /// <summary>The overall aim, in the guest's own terms where possible.</summary>
    public string? Summary { get; private set; }

    /// <summary>What the guest said they want out of the support.</summary>
    public string? GuestVoice { get; private set; }

    /// <summary>Agreed support and who provides it.</summary>
    public string? SupportArrangements { get; private set; }

    public DateOnly StartedOn { get; private set; }
    public DateOnly? ReviewDueOn { get; private set; }
    public DateOnly? ClosedOn { get; private set; }

    public Guid CreatedByStaffId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    private CarePlan() { }

    public CarePlan(Guid guestId, Guid createdByStaffId, DateOnly startedOn, DateOnly? reviewDueOn)
    {
        GuestId = guestId;
        CreatedByStaffId = createdByStaffId;
        StartedOn = startedOn;
        ReviewDueOn = reviewDueOn;
        Status = CarePlanStatus.Active;
        CreatedAt = DateTimeOffset.UtcNow;
        UpdatedAt = CreatedAt;
    }

    public void Update(string? summary, string? guestVoice, string? supportArrangements, DateOnly? reviewDueOn)
    {
        if (Status != CarePlanStatus.Active)
        {
            throw new InvalidOperationException("A closed care plan cannot be edited — start a new plan instead.");
        }

        Summary = summary;
        GuestVoice = guestVoice;
        SupportArrangements = supportArrangements;
        ReviewDueOn = reviewDueOn;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Close(CarePlanStatus status, DateOnly closedOn)
    {
        if (status == CarePlanStatus.Active)
        {
            throw new ArgumentException("Closing a plan needs a completed or superseded status.", nameof(status));
        }

        Status = status;
        ClosedOn = closedOn;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    /// <summary>True once the review date has passed — surfaced on the workspace tab.</summary>
    public bool IsReviewOverdue(DateOnly today) =>
        Status == CarePlanStatus.Active && ReviewDueOn is not null && ReviewDueOn < today;
}

/// <summary>One goal within a care plan, tracked to an outcome.</summary>
public class CarePlanGoal : Entity
{
    public Guid CarePlanId { get; private set; }
    public string Description { get; private set; } = default!;
    public CarePlanGoalStatus Status { get; private set; }
    public DateOnly? TargetDate { get; private set; }
    public string? ProgressNote { get; private set; }
    public int SortOrder { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    private CarePlanGoal() { }

    public CarePlanGoal(Guid carePlanId, string description, DateOnly? targetDate, int sortOrder)
    {
        CarePlanId = carePlanId;
        Description = description;
        TargetDate = targetDate;
        SortOrder = sortOrder;
        Status = CarePlanGoalStatus.NotStarted;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Update(string description, CarePlanGoalStatus status, DateOnly? targetDate, string? progressNote, int sortOrder)
    {
        Description = description;
        Status = status;
        TargetDate = targetDate;
        ProgressNote = progressNote;
        SortOrder = sortOrder;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
