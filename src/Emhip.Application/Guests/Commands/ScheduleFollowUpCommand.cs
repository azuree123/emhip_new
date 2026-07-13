using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using FluentValidation;
using MediatR;

namespace Emhip.Application.Guests.Commands;

public sealed record ScheduleFollowUpCommand(Guid GuestId, DateOnly DueDate, Guid AssigneeStaffId, string? Notes) : IRequest<Guid>;

public sealed class ScheduleFollowUpCommandValidator : AbstractValidator<ScheduleFollowUpCommand>
{
    public ScheduleFollowUpCommandValidator()
    {
        RuleFor(x => x.GuestId).NotEmpty();
        RuleFor(x => x.AssigneeStaffId).NotEmpty();
    }
}

public sealed class ScheduleFollowUpCommandHandler(IAppDbContext db) : IRequestHandler<ScheduleFollowUpCommand, Guid>
{
    public async Task<Guid> Handle(ScheduleFollowUpCommand request, CancellationToken cancellationToken)
    {
        var followUp = new FollowUp(request.GuestId, request.DueDate, request.AssigneeStaffId, request.Notes);
        db.FollowUps.Add(followUp);
        await db.SaveChangesAsync(cancellationToken);
        return followUp.Id;
    }
}
