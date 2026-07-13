using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using FluentValidation;
using MediatR;

namespace Emhip.Application.Guests.Commands;

public sealed record CreatePathwayReferralCommand(Guid GuestId, PathwayCategory Category, string? Detail) : IRequest<Guid>;

public sealed class CreatePathwayReferralCommandValidator : AbstractValidator<CreatePathwayReferralCommand>
{
    public CreatePathwayReferralCommandValidator()
    {
        RuleFor(x => x.GuestId).NotEmpty();
        RuleFor(x => x.Category).IsInEnum();
    }
}

public sealed class CreatePathwayReferralCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    : IRequestHandler<CreatePathwayReferralCommand, Guid>
{
    public async Task<Guid> Handle(CreatePathwayReferralCommand request, CancellationToken cancellationToken)
    {
        var referral = new PathwayReferral(request.GuestId, request.Category, request.Detail, currentUser.StaffId);
        db.PathwayReferrals.Add(referral);
        await db.SaveChangesAsync(cancellationToken);
        return referral.Id;
    }
}
