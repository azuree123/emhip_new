using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using FluentValidation;
using MediatR;

namespace Emhip.Application.Guests.Commands;

public sealed record RegisterGuestCommand(
    string FirstName,
    string LastName,
    DateOnly DateOfBirth,
    bool ConsentGiven,
    string? Gender,
    string? ContactPhone,
    string? ContactEmail,
    string? AddressLine1,
    string? AddressLine2,
    string? PostCode,
    Guid? AssignedCmhwId,
    string? ReferralSource = null) : IRequest<Guid>;

public sealed class RegisterGuestCommandValidator : AbstractValidator<RegisterGuestCommand>
{
    public RegisterGuestCommandValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.DateOfBirth).LessThan(x => DateOnly.FromDateTime(DateTime.UtcNow));
        RuleFor(x => x.ConsentGiven).Equal(true).WithMessage("Consent is required to register a guest.");
        RuleFor(x => x.ContactEmail).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.ContactEmail));
    }
}

public sealed class RegisterGuestCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    : IRequestHandler<RegisterGuestCommand, Guid>
{
    public async Task<Guid> Handle(RegisterGuestCommand request, CancellationToken cancellationToken)
    {
        var guest = new Guest(
            currentUser.HubId,
            request.FirstName,
            request.LastName,
            request.DateOfBirth,
            currentUser.StaffId,
            request.ConsentGiven,
            request.Gender,
            request.ContactPhone,
            request.ContactEmail,
            request.AddressLine1,
            request.AddressLine2,
            request.PostCode,
            request.AssignedCmhwId,
            request.ReferralSource);

        db.Guests.Add(guest);
        await db.SaveChangesAsync(cancellationToken);
        return guest.Id;
    }
}
