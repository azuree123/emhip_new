using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Guests.CarePlans;

public sealed record CarePlanGoalDto(
    Guid Id, string Description, CarePlanGoalStatus Status, DateOnly? TargetDate, string? ProgressNote, int SortOrder);

public sealed record CarePlanDto(
    Guid Id,
    Guid GuestId,
    CarePlanStatus Status,
    string? Summary,
    string? GuestVoice,
    string? SupportArrangements,
    DateOnly StartedOn,
    DateOnly? ReviewDueOn,
    DateOnly? ClosedOn,
    bool IsReviewOverdue,
    string CreatedByName,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<CarePlanGoalDto> Goals);

/// <summary>The guest's current plan plus any closed ones, newest first.</summary>
public sealed record GuestCarePlansDto(CarePlanDto? Current, IReadOnlyList<CarePlanDto> History);

public sealed record GetGuestCarePlansQuery(Guid GuestId) : IRequest<GuestCarePlansDto>;

public sealed class GetGuestCarePlansQueryHandler(IGuestReadService reads) : IRequestHandler<GetGuestCarePlansQuery, GuestCarePlansDto>
{
    public Task<GuestCarePlansDto> Handle(GetGuestCarePlansQuery request, CancellationToken cancellationToken) =>
        reads.GetCarePlansAsync(request.GuestId, cancellationToken);
}

public sealed record CarePlanGoalInput(Guid? Id, string Description, CarePlanGoalStatus Status, DateOnly? TargetDate, string? ProgressNote);

/// <summary>
/// Creates the guest's plan or updates the active one, replacing its goal list. Editing a closed
/// plan is refused by the aggregate — a new plan supersedes it instead.
/// </summary>
public sealed record SaveCarePlanCommand(
    Guid GuestId,
    string? Summary,
    string? GuestVoice,
    string? SupportArrangements,
    DateOnly? ReviewDueOn,
    IReadOnlyList<CarePlanGoalInput> Goals) : IRequest<Guid>;

public sealed class SaveCarePlanCommandValidator : AbstractValidator<SaveCarePlanCommand>
{
    public SaveCarePlanCommandValidator()
    {
        RuleFor(x => x.GuestId).NotEmpty();
        RuleFor(x => x.Summary).MaximumLength(4000);
        RuleFor(x => x.GuestVoice).MaximumLength(4000);
        RuleFor(x => x.SupportArrangements).MaximumLength(4000);
        RuleForEach(x => x.Goals).ChildRules(goal =>
        {
            goal.RuleFor(g => g.Description).NotEmpty().MaximumLength(500);
            goal.RuleFor(g => g.ProgressNote).MaximumLength(2000);
        });
    }
}

public sealed class SaveCarePlanCommandHandler(IAppDbContext db, ICurrentUser currentUser) : IRequestHandler<SaveCarePlanCommand, Guid>
{
    public async Task<Guid> Handle(SaveCarePlanCommand request, CancellationToken cancellationToken)
    {
        var guestExists = await db.Guests.AsNoTracking().AnyAsync(g => g.Id == request.GuestId, cancellationToken);
        if (!guestExists) throw new KeyNotFoundException($"Guest {request.GuestId} not found.");

        var plan = await db.CarePlans
            .FirstOrDefaultAsync(p => p.GuestId == request.GuestId && p.Status == CarePlanStatus.Active, cancellationToken);

        if (plan is null)
        {
            plan = new CarePlan(request.GuestId, currentUser.StaffId, DateOnly.FromDateTime(DateTime.UtcNow), request.ReviewDueOn);
            db.CarePlans.Add(plan);
            await db.SaveChangesAsync(cancellationToken); // the goals need the plan's id
        }

        plan.Update(request.Summary, request.GuestVoice, request.SupportArrangements, request.ReviewDueOn);

        var existingGoals = await db.CarePlanGoals.Where(g => g.CarePlanId == plan.Id).ToListAsync(cancellationToken);

        // Goals absent from the submitted list were removed in the editor.
        var keptIds = request.Goals.Where(g => g.Id is not null).Select(g => g.Id!.Value).ToHashSet();
        db.CarePlanGoals.RemoveRange(existingGoals.Where(g => !keptIds.Contains(g.Id)));

        for (var index = 0; index < request.Goals.Count; index++)
        {
            var input = request.Goals[index];
            var goal = input.Id is null ? null : existingGoals.FirstOrDefault(g => g.Id == input.Id);

            if (goal is null)
            {
                goal = new CarePlanGoal(plan.Id, input.Description, input.TargetDate, index + 1);
                db.CarePlanGoals.Add(goal);
            }

            goal.Update(input.Description, input.Status, input.TargetDate, input.ProgressNote, index + 1);
        }

        await db.SaveChangesAsync(cancellationToken);
        return plan.Id;
    }
}

/// <summary>Closes the active plan as completed, or superseded when a replacement is being written.</summary>
public sealed record CloseCarePlanCommand(Guid GuestId, CarePlanStatus Status) : IRequest;

public sealed class CloseCarePlanCommandHandler(IAppDbContext db) : IRequestHandler<CloseCarePlanCommand>
{
    public async Task Handle(CloseCarePlanCommand request, CancellationToken cancellationToken)
    {
        var plan = await db.CarePlans
            .FirstOrDefaultAsync(p => p.GuestId == request.GuestId && p.Status == CarePlanStatus.Active, cancellationToken)
            ?? throw new KeyNotFoundException("This guest has no active care plan.");

        plan.Close(request.Status, DateOnly.FromDateTime(DateTime.UtcNow));
        await db.SaveChangesAsync(cancellationToken);
    }
}
