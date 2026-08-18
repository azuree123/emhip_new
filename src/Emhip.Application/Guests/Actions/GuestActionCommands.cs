using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Guests.Actions;

public sealed record GuestActionDto(
    Guid Id, string Description, DateOnly DueDate,
    Guid? AssignedToStaffId, string? AssignedToName,
    bool IsCompleted, bool IsOverdue, DateTimeOffset CreatedAt, DateTimeOffset? CompletedAt);

public sealed record GetGuestActionsQuery(Guid GuestId) : IRequest<IReadOnlyList<GuestActionDto>>;

public sealed class GetGuestActionsQueryHandler(IGuestReadService reads) : IRequestHandler<GetGuestActionsQuery, IReadOnlyList<GuestActionDto>>
{
    public Task<IReadOnlyList<GuestActionDto>> Handle(GetGuestActionsQuery request, CancellationToken cancellationToken) =>
        reads.GetActionsAsync(request.GuestId, cancellationToken);
}

public sealed record AddGuestActionCommand(Guid GuestId, string Description, DateOnly DueDate, Guid? AssignedToStaffId) : IRequest<Guid>;

public sealed class AddGuestActionCommandValidator : AbstractValidator<AddGuestActionCommand>
{
    public AddGuestActionCommandValidator()
    {
        RuleFor(x => x.GuestId).NotEmpty();
        RuleFor(x => x.Description).NotEmpty().MaximumLength(500);
    }
}

public sealed class AddGuestActionCommandHandler(IAppDbContext db) : IRequestHandler<AddGuestActionCommand, Guid>
{
    public async Task<Guid> Handle(AddGuestActionCommand request, CancellationToken cancellationToken)
    {
        var action = new GuestAction(request.GuestId, request.Description, request.DueDate, request.AssignedToStaffId);
        db.GuestActions.Add(action);
        await db.SaveChangesAsync(cancellationToken);
        return action.Id;
    }
}

public sealed record UpdateGuestActionCommand(
    Guid GuestId, Guid ActionId, string Description, DateOnly DueDate, Guid? AssignedToStaffId, bool IsCompleted) : IRequest;

public sealed class UpdateGuestActionCommandValidator : AbstractValidator<UpdateGuestActionCommand>
{
    public UpdateGuestActionCommandValidator()
    {
        RuleFor(x => x.ActionId).NotEmpty();
        RuleFor(x => x.Description).NotEmpty().MaximumLength(500);
    }
}

public sealed class UpdateGuestActionCommandHandler(IAppDbContext db) : IRequestHandler<UpdateGuestActionCommand>
{
    public async Task Handle(UpdateGuestActionCommand request, CancellationToken cancellationToken)
    {
        var action = await db.GuestActions
            .FirstOrDefaultAsync(a => a.Id == request.ActionId && a.GuestId == request.GuestId, cancellationToken)
            ?? throw new KeyNotFoundException($"Action {request.ActionId} not found for guest {request.GuestId}.");

        action.Update(request.Description, request.DueDate, request.AssignedToStaffId);
        if (action.IsCompleted != request.IsCompleted) action.SetCompleted(request.IsCompleted);
        await db.SaveChangesAsync(cancellationToken);
    }
}

public sealed record DeleteGuestActionCommand(Guid GuestId, Guid ActionId) : IRequest;

public sealed class DeleteGuestActionCommandHandler(IAppDbContext db) : IRequestHandler<DeleteGuestActionCommand>
{
    public async Task Handle(DeleteGuestActionCommand request, CancellationToken cancellationToken)
    {
        var action = await db.GuestActions
            .FirstOrDefaultAsync(a => a.Id == request.ActionId && a.GuestId == request.GuestId, cancellationToken)
            ?? throw new KeyNotFoundException($"Action {request.ActionId} not found for guest {request.GuestId}.");

        db.GuestActions.Remove(action);
        await db.SaveChangesAsync(cancellationToken);
    }
}
