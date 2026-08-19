using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Guests.Pathways;

public sealed record PathwayChangeDto(
    Guid Id,
    GuestPathway? FromPathway,
    GuestPathway ToPathway,
    string? Reason,
    string? AssignedByName,
    DateOnly ChangedOn,
    string RecordedByName,
    DateTimeOffset CreatedAt);

/// <summary>
/// "Change Pathway" — moves the guest onto a new pathway and appends the history entry the
/// Pathway History card is built from (what changed, why, who authorised it, and when).
/// </summary>
public sealed record ChangeGuestPathwayCommand(
    Guid GuestId,
    GuestPathway Pathway,
    string? Reason,
    Guid? AssignedByStaffId,
    string? AssignedByName,
    DateOnly ChangedOn) : IRequest<Guid>;

public sealed class ChangeGuestPathwayCommandValidator : AbstractValidator<ChangeGuestPathwayCommand>
{
    public ChangeGuestPathwayCommandValidator()
    {
        RuleFor(x => x.GuestId).NotEmpty();
        RuleFor(x => x.Reason).MaximumLength(2000);
        RuleFor(x => x.AssignedByName).MaximumLength(200);
        RuleFor(x => x.ChangedOn)
            .LessThanOrEqualTo(_ => DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1))
            .WithMessage("The date of change cannot be in the future.");
    }
}

public sealed class ChangeGuestPathwayCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    : IRequestHandler<ChangeGuestPathwayCommand, Guid>
{
    public async Task<Guid> Handle(ChangeGuestPathwayCommand request, CancellationToken cancellationToken)
    {
        var guest = await db.Guests.FirstOrDefaultAsync(g => g.Id == request.GuestId, cancellationToken)
            ?? throw new KeyNotFoundException($"Guest {request.GuestId} not found.");

        var previous = guest.Pathway;
        if (previous == request.Pathway)
        {
            throw new InvalidOperationException("The guest is already on this pathway.");
        }

        guest.Allocate(request.Pathway, guest.AfaSupportNeeded);

        var change = new PathwayChange(
            request.GuestId, previous, request.Pathway, request.Reason,
            request.AssignedByStaffId, request.AssignedByName, request.ChangedOn, currentUser.StaffId);

        db.PathwayChanges.Add(change);
        await db.SaveChangesAsync(cancellationToken);
        return change.Id;
    }
}
