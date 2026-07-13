using Emhip.Domain.Common;
using Emhip.Domain.Enums;
using Emhip.Domain.Events;

namespace Emhip.Domain.Entities;

/// <summary>Scheduled follow-up. Backs the Global Follow-up queue and dashboard "overdue" counts.</summary>
public class FollowUp : Entity, IHasDomainEvents
{
    public Guid GuestId { get; private set; }
    public DateOnly DueDate { get; private set; }
    public Guid AssigneeStaffId { get; private set; }
    public FollowUpStatus Status { get; private set; }
    public string? Notes { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }

    private readonly List<IDomainEvent> _events = [];
    public IReadOnlyCollection<IDomainEvent> DomainEvents => _events.AsReadOnly();

    private FollowUp() { }

    public FollowUp(Guid guestId, DateOnly dueDate, Guid assigneeStaffId, string? notes)
    {
        GuestId = guestId;
        DueDate = dueDate;
        AssigneeStaffId = assigneeStaffId;
        Notes = notes;
        Status = FollowUpStatus.Scheduled;
        CreatedAt = DateTimeOffset.UtcNow;

        _events.Add(new FollowUpScheduledEvent(GuestId, Id, DueDate, CreatedAt));
    }

    public void Complete()
    {
        Status = FollowUpStatus.Completed;
        CompletedAt = DateTimeOffset.UtcNow;
    }

    public void MarkOverdue()
    {
        if (Status == FollowUpStatus.Scheduled) Status = FollowUpStatus.Overdue;
    }

    public void Cancel() => Status = FollowUpStatus.Cancelled;

    public void ClearDomainEvents() => _events.Clear();
}
