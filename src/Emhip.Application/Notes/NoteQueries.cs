using Emhip.Application.Abstractions;
using Emhip.Application.Guests;
using Emhip.Application.Guests.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Notes;

/// <summary>All quick notes for a guest, pinned first.</summary>
public sealed record GetGuestNotesQuery(Guid GuestId) : IRequest<IReadOnlyList<GuestNoteDto>>;

public sealed class GetGuestNotesQueryHandler(IGuestReadService reads) : IRequestHandler<GetGuestNotesQuery, IReadOnlyList<GuestNoteDto>>
{
    public Task<IReadOnlyList<GuestNoteDto>> Handle(GetGuestNotesQuery request, CancellationToken cancellationToken) =>
        reads.GetNotesAsync(request.GuestId, cancellationToken);
}

/// <summary>Pinning surfaces a note on the guest overview; unpinning removes it from there.</summary>
public sealed record SetNotePinnedCommand(Guid GuestId, Guid NoteId, bool IsPinned) : IRequest;

public sealed class SetNotePinnedCommandHandler(IAppDbContext db) : IRequestHandler<SetNotePinnedCommand>
{
    public async Task Handle(SetNotePinnedCommand request, CancellationToken cancellationToken)
    {
        var note = await db.Notes.FirstOrDefaultAsync(n => n.Id == request.NoteId && n.GuestId == request.GuestId, cancellationToken)
            ?? throw new KeyNotFoundException($"Note {request.NoteId} not found.");

        if (request.IsPinned) note.Pin();
        else note.Unpin();

        await db.SaveChangesAsync(cancellationToken);
    }
}
