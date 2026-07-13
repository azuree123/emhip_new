using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using FluentValidation;
using MediatR;

namespace Emhip.Application.Contacts;

/// <summary>Backs "Add Contact" from the Global Follow-up screen and the Guest Workspace Follow-up tab.</summary>
public sealed record AddContactCommand(
    Guid GuestId,
    ContactType Type,
    ContactOutcome Outcome,
    DateTimeOffset OccurredAt,
    string? Notes) : IRequest<Guid>;

public sealed class AddContactCommandValidator : AbstractValidator<AddContactCommand>
{
    public AddContactCommandValidator()
    {
        RuleFor(x => x.GuestId).NotEmpty();
        RuleFor(x => x.OccurredAt).LessThanOrEqualTo(_ => DateTimeOffset.UtcNow.AddMinutes(5));
    }
}

public sealed class AddContactCommandHandler(IAppDbContext db, ICurrentUser currentUser) : IRequestHandler<AddContactCommand, Guid>
{
    public async Task<Guid> Handle(AddContactCommand request, CancellationToken cancellationToken)
    {
        var contact = new Contact(request.GuestId, request.Type, request.Outcome, request.OccurredAt, currentUser.StaffId, request.Notes);
        db.Contacts.Add(contact);
        await db.SaveChangesAsync(cancellationToken);
        return contact.Id;
    }
}
