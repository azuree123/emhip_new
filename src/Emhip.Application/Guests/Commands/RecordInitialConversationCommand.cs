using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Guests.Commands;

public sealed record RecordInitialConversationCommand(
    Guid GuestId,
    string? PresentingIssues,
    string? Notes,
    bool ConsentConfirmed) : IRequest<Guid>;

public sealed class RecordInitialConversationCommandValidator : AbstractValidator<RecordInitialConversationCommand>
{
    public RecordInitialConversationCommandValidator()
    {
        RuleFor(x => x.GuestId).NotEmpty();
        RuleFor(x => x.ConsentConfirmed).Equal(true);
    }
}

public sealed class RecordInitialConversationCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    : IRequestHandler<RecordInitialConversationCommand, Guid>
{
    public async Task<Guid> Handle(RecordInitialConversationCommand request, CancellationToken cancellationToken)
    {
        var record = new InitialConversationRecord(request.GuestId, currentUser.StaffId, request.PresentingIssues, request.Notes, request.ConsentConfirmed);
        db.InitialConversationRecords.Add(record);

        var guest = await db.Guests.FirstAsync(g => g.Id == request.GuestId, cancellationToken);
        guest.UpdateStatus(GuestStatus.Active);

        await db.SaveChangesAsync(cancellationToken);
        return record.Id;
    }
}
