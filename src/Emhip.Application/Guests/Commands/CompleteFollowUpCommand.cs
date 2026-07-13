using Emhip.Application.Abstractions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Guests.Commands;

public sealed record CompleteFollowUpCommand(Guid FollowUpId) : IRequest;

public sealed class CompleteFollowUpCommandValidator : AbstractValidator<CompleteFollowUpCommand>
{
    public CompleteFollowUpCommandValidator() => RuleFor(x => x.FollowUpId).NotEmpty();
}

public sealed class CompleteFollowUpCommandHandler(IAppDbContext db) : IRequestHandler<CompleteFollowUpCommand>
{
    public async Task Handle(CompleteFollowUpCommand request, CancellationToken cancellationToken)
    {
        var followUp = await db.FollowUps.FirstAsync(f => f.Id == request.FollowUpId, cancellationToken);
        followUp.Complete();
        await db.SaveChangesAsync(cancellationToken);
    }
}
