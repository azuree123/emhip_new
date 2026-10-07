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
    string? GuestVoice,
    string? SupportArrangements,
    string? BetweenSessions,
    string? Referrals,
    string? OtherNotes,
    DateOnly? NextContactOn,
    bool? CpnInvolvementRequired,
    CarePlanNhsReferral? NhsReferral,
    DateOnly StartedOn,
    DateOnly? ReviewDueOn,
    DateOnly? ClosedOn,
    bool IsReviewOverdue,
    string CreatedByName,
    DateTimeOffset CreatedAt,
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
/// Writes the guest's care plan and replaces its goal list. With <see cref="StartNew"/> false it
/// updates the active plan (creating one when there is none); with it true — "Create New Plan" —
/// the active plan is closed as superseded and a fresh plan started in the same save. Editing a
/// closed plan is refused by the aggregate.
/// </summary>
public sealed record SaveCarePlanCommand(
    Guid GuestId,
    string? GuestVoice,
    string? SupportArrangements,
    string? BetweenSessions,
    string? Referrals,
    string? OtherNotes,
    DateOnly? NextContactOn,
    DateOnly? ReviewDueOn,
    bool? CpnInvolvementRequired,
    CarePlanNhsReferral? NhsReferral,
    IReadOnlyList<CarePlanGoalInput> Goals,
    bool StartNew = false) : IRequest<Guid>;

public sealed class SaveCarePlanCommandValidator : AbstractValidator<SaveCarePlanCommand>
{
    public SaveCarePlanCommandValidator()
    {
        RuleFor(x => x.GuestId).NotEmpty();
        RuleFor(x => x.GuestVoice).NotEmpty().WithMessage("Record what the guest wants to work on.").MaximumLength(4000);
        RuleFor(x => x.SupportArrangements).NotEmpty().WithMessage("Record the support we will provide.").MaximumLength(4000);
        RuleFor(x => x.BetweenSessions).MaximumLength(4000);
        RuleFor(x => x.Referrals).MaximumLength(4000);
        RuleFor(x => x.OtherNotes).MaximumLength(4000);
        RuleFor(x => x.NextContactOn).NotNull().WithMessage("Set the date of the next contact.");
        RuleFor(x => x.ReviewDueOn).NotNull().WithMessage("Set the MDT review date.");
        RuleFor(x => x.CpnInvolvementRequired).NotNull().WithMessage("Say whether CPN involvement is required.");
        RuleFor(x => x.NhsReferral).NotNull().WithMessage("Say whether a referral to NHS services has been made or discussed.").IsInEnum();
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

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var plan = await db.CarePlans
            .FirstOrDefaultAsync(p => p.GuestId == request.GuestId && p.Status == CarePlanStatus.Active, cancellationToken);

        if (plan is not null && request.StartNew)
        {
            // Closed in the same save that adds its replacement, so the guest never has two active plans.
            plan.Close(CarePlanStatus.Superseded, today);
            plan = null;
        }

        var existingGoals = new List<CarePlanGoal>();
        if (plan is null)
        {
            plan = new CarePlan(request.GuestId, currentUser.StaffId, today, request.ReviewDueOn);
            db.CarePlans.Add(plan);
        }
        else
        {
            existingGoals = await db.CarePlanGoals.Where(g => g.CarePlanId == plan.Id).ToListAsync(cancellationToken);
        }

        plan.Update(
            request.GuestVoice, request.SupportArrangements, request.BetweenSessions, request.Referrals, request.OtherNotes,
            request.NextContactOn, request.ReviewDueOn, request.CpnInvolvementRequired, request.NhsReferral);

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
