using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Guests.Commands;

public sealed record UpdateDemographicsCommand(
    Guid GuestId,
    string? Ethnicity,
    string? Nationality,
    string? PreferredLanguage,
    bool InterpreterNeeded,
    string? HousingStatus,
    string? EmploymentStatus,
    string? MaritalStatus,
    string? LivingGroup,
    string? CountryOfOrigin,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    string? EmergencyContactRelationship,
    string? GpName,
    string? GpPractice,
    string? NhsNumber) : IRequest;

public sealed class UpdateDemographicsCommandValidator : AbstractValidator<UpdateDemographicsCommand>
{
    public UpdateDemographicsCommandValidator()
    {
        RuleFor(x => x.GuestId).NotEmpty();
        RuleFor(x => x.EmergencyContactPhone).MaximumLength(30);
    }
}

public sealed class UpdateDemographicsCommandHandler(IAppDbContext db) : IRequestHandler<UpdateDemographicsCommand>
{
    public async Task Handle(UpdateDemographicsCommand request, CancellationToken cancellationToken)
    {
        var demographics = await db.GuestDemographics
            .FirstOrDefaultAsync(d => d.GuestId == request.GuestId, cancellationToken);

        if (demographics is null)
        {
            demographics = new GuestDemographics(request.GuestId);
            db.GuestDemographics.Add(demographics);
        }

        demographics.Update(
            request.Ethnicity, request.Nationality, request.PreferredLanguage, request.InterpreterNeeded,
            request.HousingStatus, request.EmploymentStatus, request.MaritalStatus, request.LivingGroup, request.CountryOfOrigin,
            request.EmergencyContactName, request.EmergencyContactPhone, request.EmergencyContactRelationship,
            request.GpName, request.GpPractice, request.NhsNumber);

        await db.SaveChangesAsync(cancellationToken);
    }
}
