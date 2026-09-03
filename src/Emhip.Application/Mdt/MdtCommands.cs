using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Mdt;

/// <summary>"Confirm assign CPN" — allocates the CPN and begins tracking CPN activity separately in reports.</summary>
public sealed record ConfirmCpnReferralCommand(Guid ItemId, Guid AssignedCpnStaffId, string? ConfirmationNote) : IRequest;

public sealed class ConfirmCpnReferralCommandValidator : AbstractValidator<ConfirmCpnReferralCommand>
{
    public ConfirmCpnReferralCommandValidator()
    {
        RuleFor(x => x.ItemId).NotEmpty();
        RuleFor(x => x.AssignedCpnStaffId).NotEmpty().WithMessage("Select the CPN to assign.");
        RuleFor(x => x.ConfirmationNote).MaximumLength(4000);
    }
}

public sealed class ConfirmCpnReferralCommandHandler(IAppDbContext db, ICurrentUser currentUser) : IRequestHandler<ConfirmCpnReferralCommand>
{
    public async Task Handle(ConfirmCpnReferralCommand request, CancellationToken cancellationToken)
    {
        var item = await db.MdtQueueItems.FirstOrDefaultAsync(i => i.Id == request.ItemId, cancellationToken)
            ?? throw new KeyNotFoundException($"MDT item {request.ItemId} not found.");

        item.ConfirmCpn(currentUser.StaffId, request.AssignedCpnStaffId, request.ConfirmationNote);

        // The confirmation is what makes the guest "CPN involved" on the clinical profile (the
        // dashboard's clinical complexity indicator and the CPN activity caseload read it).
        var profile = await db.GuestClinicalProfiles.FirstOrDefaultAsync(p => p.GuestId == item.GuestId, cancellationToken);
        if (profile is null)
        {
            profile = new GuestClinicalProfile(item.GuestId);
            db.GuestClinicalProfiles.Add(profile);
        }
        profile.SetCpnInvolved(true);

        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>"Decline with reason" — the guest returns to CMHW-only support with a documented reason.</summary>
public sealed record DeclineMdtItemCommand(Guid ItemId, string Reason, string? Context) : IRequest;

public sealed class DeclineMdtItemCommandValidator : AbstractValidator<DeclineMdtItemCommand>
{
    public DeclineMdtItemCommandValidator()
    {
        RuleFor(x => x.ItemId).NotEmpty();
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500).WithMessage("A reason for declining is required.");
        RuleFor(x => x.Context).MaximumLength(4000);
    }
}

public sealed class DeclineMdtItemCommandHandler(IAppDbContext db, ICurrentUser currentUser) : IRequestHandler<DeclineMdtItemCommand>
{
    public async Task Handle(DeclineMdtItemCommand request, CancellationToken cancellationToken)
    {
        var item = await db.MdtQueueItems.FirstOrDefaultAsync(i => i.Id == request.ItemId, cancellationToken)
            ?? throw new KeyNotFoundException($"MDT item {request.ItemId} not found.");
        item.Decline(currentUser.StaffId, request.Reason, request.Context);
        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>"Mark as discussed" — the MDT note is required and becomes the permanent record of the discussion.</summary>
public sealed record MarkMdtDiscussedCommand(Guid ItemId, string MdtNote) : IRequest;

public sealed class MarkMdtDiscussedCommandValidator : AbstractValidator<MarkMdtDiscussedCommand>
{
    public MarkMdtDiscussedCommandValidator()
    {
        RuleFor(x => x.ItemId).NotEmpty();
        RuleFor(x => x.MdtNote).NotEmpty().MaximumLength(4000).WithMessage("An MDT note is required.");
    }
}

public sealed class MarkMdtDiscussedCommandHandler(IAppDbContext db, ICurrentUser currentUser) : IRequestHandler<MarkMdtDiscussedCommand>
{
    public async Task Handle(MarkMdtDiscussedCommand request, CancellationToken cancellationToken)
    {
        var item = await db.MdtQueueItems.FirstOrDefaultAsync(i => i.Id == request.ItemId, cancellationToken)
            ?? throw new KeyNotFoundException($"MDT item {request.ItemId} not found.");
        item.MarkDiscussed(currentUser.StaffId, request.MdtNote);
        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Raises queue items from the places that request them, without creating duplicates of a still-pending one.</summary>
public static class MdtQueueRaiser
{
    public static async Task RaiseAsync(
        IAppDbContext db, Guid guestId, MdtQueueKind kind, Guid requestedBy, string reason, string? details, string? urgency,
        Guid? sourceNoteId, CancellationToken cancellationToken)
    {
        var alreadyPending = await db.MdtQueueItems.AsNoTracking()
            .AnyAsync(i => i.GuestId == guestId && i.Kind == kind && i.Status == MdtQueueStatus.Pending, cancellationToken);
        if (alreadyPending) return;
        db.MdtQueueItems.Add(new MdtQueueItem(guestId, kind, requestedBy, reason, details, urgency, sourceNoteId));
    }
}
