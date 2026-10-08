using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
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
    string? ReferralSource = null,
    /// <summary>Primary or Secondary referral (spec §6.2).</summary>
    ReferralType? ReferralType = null,
    /// <summary>Structured subcategory — required by the spec when the referral is Secondary.</summary>
    string? ReferralSubcategory = null,
    /// <summary>"How did you hear about us?" — the ticked boxes; optional, so empty or null is fine.</summary>
    IReadOnlyList<HeardAboutUsSource>? HeardAboutUs = null,
    /// <summary>Required when Other is ticked; ignored otherwise.</summary>
    string? HeardAboutUsOther = null) : IRequest<Guid>;

public sealed class RegisterGuestCommandValidator : AbstractValidator<RegisterGuestCommand>
{
    public RegisterGuestCommandValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.DateOfBirth).LessThan(x => DateOnly.FromDateTime(DateTime.UtcNow));
        RuleFor(x => x.ConsentGiven).Equal(true).WithMessage("Consent is required to register a guest.");
        RuleFor(x => x.ContactEmail).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.ContactEmail));
        RuleFor(x => x.ReferralSubcategory).NotEmpty()
            .When(x => x.ReferralType == Emhip.Domain.Enums.ReferralType.Secondary)
            .WithMessage("A secondary referral needs a subcategory.");
        RuleFor(x => x.ReferralSubcategory).MaximumLength(150);
        // "How did you hear about us?" is optional. Only a ticked "Other" needs its text; without
        // it the text is dropped, so it isn't validated either.
        RuleForEach(x => x.HeardAboutUs).IsInEnum();
        When(x => HeardAboutUsSources.Combine(x.HeardAboutUs).HasFlag(HeardAboutUsSource.Other), () =>
        {
            RuleFor(x => x.HeardAboutUsOther).NotEmpty()
                .WithMessage("Please specify how the guest heard about us.");
            RuleFor(x => x.HeardAboutUsOther).MaximumLength(200);
        });
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

        if (request.ReferralType is not null)
        {
            guest.SetReferral(request.ReferralType, request.ReferralSubcategory, request.ReferralSource);
        }

        guest.SetHeardAboutUs(HeardAboutUsSources.Combine(request.HeardAboutUs), request.HeardAboutUsOther);

        db.Guests.Add(guest);
        await db.SaveChangesAsync(cancellationToken);
        return guest.Id;
    }
}
