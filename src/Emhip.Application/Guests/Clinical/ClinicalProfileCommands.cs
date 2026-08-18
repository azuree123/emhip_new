using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Guests.Clinical;

public sealed record ClinicalProfileDto(
    Guid GuestId,
    bool PreviousMhDiagnosis, string? DiagnosisGroups, string? PresentingProblem,
    string? PastMhDifficulties, string? FamilyMhHistory,
    string? LongTermHealthCondition, string? PhysicalIllness, string? CurrentMedications,
    string? MhTeamClinician, string? SocialServicesCoordinator, bool CpnInvolved, bool TrustInvolvement,
    bool SmiIndicator, DateTimeOffset? UpdatedAt);

public sealed record GetClinicalProfileQuery(Guid GuestId) : IRequest<ClinicalProfileDto?>;

public sealed class GetClinicalProfileQueryHandler(IAppDbContext db) : IRequestHandler<GetClinicalProfileQuery, ClinicalProfileDto?>
{
    public async Task<ClinicalProfileDto?> Handle(GetClinicalProfileQuery request, CancellationToken cancellationToken)
    {
        var dto = await db.GuestClinicalProfiles.AsNoTracking()
            .Where(p => p.GuestId == request.GuestId)
            .Select(p => new ClinicalProfileDto(
                p.GuestId, p.PreviousMhDiagnosis, p.DiagnosisGroups, p.PresentingProblem,
                p.PastMhDifficulties, p.FamilyMhHistory,
                p.LongTermHealthCondition, p.PhysicalIllness, p.CurrentMedications,
                p.MhTeamClinician, p.SocialServicesCoordinator, p.CpnInvolved, p.TrustInvolvement,
                p.SmiIndicator, p.UpdatedAt))
            .FirstOrDefaultAsync(cancellationToken);
        if (dto is not null) return dto;

        // Created lazily on first save — a guest without one is "nothing recorded yet", not 404.
        var exists = await db.Guests.AsNoTracking().AnyAsync(g => g.Id == request.GuestId, cancellationToken);
        return exists
            ? new ClinicalProfileDto(request.GuestId, false, null, null, null, null, null, null, null, null, null, false, false, false, null)
            : null;
    }
}

public sealed record UpdateClinicalProfileCommand(
    Guid GuestId,
    bool PreviousMhDiagnosis, string? DiagnosisGroups, string? PresentingProblem,
    string? PastMhDifficulties, string? FamilyMhHistory,
    string? LongTermHealthCondition, string? PhysicalIllness, string? CurrentMedications,
    string? MhTeamClinician, string? SocialServicesCoordinator, bool CpnInvolved, bool TrustInvolvement,
    bool SmiIndicator) : IRequest;

public sealed class UpdateClinicalProfileCommandHandler(IAppDbContext db) : IRequestHandler<UpdateClinicalProfileCommand>
{
    public async Task Handle(UpdateClinicalProfileCommand request, CancellationToken cancellationToken)
    {
        var profile = await db.GuestClinicalProfiles
            .FirstOrDefaultAsync(p => p.GuestId == request.GuestId, cancellationToken);

        if (profile is null)
        {
            profile = new GuestClinicalProfile(request.GuestId);
            db.GuestClinicalProfiles.Add(profile);
        }

        profile.Update(
            request.PreviousMhDiagnosis, request.DiagnosisGroups, request.PresentingProblem,
            request.PastMhDifficulties, request.FamilyMhHistory,
            request.LongTermHealthCondition, request.PhysicalIllness, request.CurrentMedications,
            request.MhTeamClinician, request.SocialServicesCoordinator, request.CpnInvolved, request.TrustInvolvement,
            request.SmiIndicator);

        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>"Pathway &amp; allocation" — sets the clinical pathway, the AFA flag, and optionally reassigns the CMHW.</summary>
public sealed record AllocateGuestCommand(
    Guid GuestId, Domain.Enums.GuestPathway Pathway, bool AfaSupportNeeded, Guid? AssignedCmhwId) : IRequest;

public sealed class AllocateGuestCommandHandler(IAppDbContext db) : IRequestHandler<AllocateGuestCommand>
{
    public async Task Handle(AllocateGuestCommand request, CancellationToken cancellationToken)
    {
        var guest = await db.Guests.FirstOrDefaultAsync(g => g.Id == request.GuestId, cancellationToken)
            ?? throw new KeyNotFoundException($"Guest {request.GuestId} not found.");

        guest.Allocate(request.Pathway, request.AfaSupportNeeded);
        if (request.AssignedCmhwId.HasValue) guest.Reassign(request.AssignedCmhwId);
        await db.SaveChangesAsync(cancellationToken);
    }
}
