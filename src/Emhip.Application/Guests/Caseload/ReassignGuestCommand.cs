using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Guests.Caseload;

public sealed record CaseloadAssignmentDto(
    Guid Id, string? FromStaffName, string? ToStaffName, string? Reason, string RecordedByName, DateTimeOffset RecordedAt);

/// <summary>Reassigns the guest's CMHW and logs it, as the spec requires (§4.4).</summary>
public sealed record ReassignGuestCommand(Guid GuestId, Guid? AssignedCmhwId, string? Reason) : IRequest;

public sealed class ReassignGuestCommandValidator : AbstractValidator<ReassignGuestCommand>
{
    public ReassignGuestCommandValidator() => RuleFor(x => x.Reason).MaximumLength(500);
}

public sealed class ReassignGuestCommandHandler(IAppDbContext db, ICurrentUser currentUser) : IRequestHandler<ReassignGuestCommand>
{
    public async Task Handle(ReassignGuestCommand request, CancellationToken cancellationToken)
    {
        var guest = await db.Guests.FirstOrDefaultAsync(g => g.Id == request.GuestId, cancellationToken)
            ?? throw new KeyNotFoundException($"Guest {request.GuestId} not found.");

        if (guest.AssignedCmhwId == request.AssignedCmhwId)
        {
            throw new InvalidOperationException("The guest is already allocated to this worker.");
        }

        // Unallocating is blocked on the pathways that mandate a named worker (§4.4).
        if (request.AssignedCmhwId is null && guest.Pathway is not null
            && Commands.GuestPathwayRules.RequiresNamedCmhw(guest.Pathway.Value))
        {
            throw new InvalidOperationException("This pathway requires a named CMHW — reassign rather than clearing the allocation.");
        }

        var previous = guest.AssignedCmhwId;
        guest.Reassign(request.AssignedCmhwId);

        db.CaseloadAssignments.Add(new CaseloadAssignment(
            guest.Id, previous, request.AssignedCmhwId, request.Reason, currentUser.StaffId));

        await db.SaveChangesAsync(cancellationToken);
    }
}

public sealed record GetCaseloadHistoryQuery(Guid GuestId) : IRequest<IReadOnlyList<CaseloadAssignmentDto>>;

public sealed class GetCaseloadHistoryQueryHandler(IGuestReadService reads) : IRequestHandler<GetCaseloadHistoryQuery, IReadOnlyList<CaseloadAssignmentDto>>
{
    public Task<IReadOnlyList<CaseloadAssignmentDto>> Handle(GetCaseloadHistoryQuery request, CancellationToken cancellationToken) =>
        reads.GetCaseloadHistoryAsync(request.GuestId, cancellationToken);
}
