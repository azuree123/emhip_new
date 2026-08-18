using Emhip.Domain.Common;

namespace Emhip.Domain.Entities;

/// <summary>
/// One "Actions &amp; Reminders" item on a guest's record (workspace Action tab): a piece of
/// casework with a due date and an optional assignee. Overdue = open past its due date —
/// derived at read time, never stored.
/// </summary>
public class GuestAction : Entity
{
    public Guid GuestId { get; private set; }
    public string Description { get; private set; } = default!;
    public DateOnly DueDate { get; private set; }
    public Guid? AssignedToStaffId { get; private set; }
    public bool IsCompleted { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }

    private GuestAction() { }

    public GuestAction(Guid guestId, string description, DateOnly dueDate, Guid? assignedToStaffId)
    {
        GuestId = guestId;
        Description = description;
        DueDate = dueDate;
        AssignedToStaffId = assignedToStaffId;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public void Update(string description, DateOnly dueDate, Guid? assignedToStaffId)
    {
        Description = description;
        DueDate = dueDate;
        AssignedToStaffId = assignedToStaffId;
    }

    public void SetCompleted(bool completed)
    {
        IsCompleted = completed;
        CompletedAt = completed ? DateTimeOffset.UtcNow : null;
    }
}
