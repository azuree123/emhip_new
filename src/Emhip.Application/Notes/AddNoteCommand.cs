using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using FluentValidation;
using MediatR;

namespace Emhip.Application.Notes;

public sealed record AddNoteCommand(Guid GuestId, string Body, NoteColor Color, bool IsPinned) : IRequest<Guid>;

public sealed class AddNoteCommandValidator : AbstractValidator<AddNoteCommand>
{
    public AddNoteCommandValidator()
    {
        RuleFor(x => x.GuestId).NotEmpty();
        RuleFor(x => x.Body).NotEmpty().MaximumLength(2000);
    }
}

public sealed class AddNoteCommandHandler(IAppDbContext db, ICurrentUser currentUser) : IRequestHandler<AddNoteCommand, Guid>
{
    public async Task<Guid> Handle(AddNoteCommand request, CancellationToken cancellationToken)
    {
        var note = new Note(request.GuestId, currentUser.StaffId, request.Body, request.Color, request.IsPinned);
        db.Notes.Add(note);
        await db.SaveChangesAsync(cancellationToken);
        return note.Id;
    }
}
