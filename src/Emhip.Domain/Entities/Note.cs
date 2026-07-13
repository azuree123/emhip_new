using Emhip.Domain.Common;
using Emhip.Domain.Enums;

namespace Emhip.Domain.Entities;

/// <summary>A sticky note on a Guest Workspace (see design-system Sticky/StickyNote* components).</summary>
public class Note : Entity
{
    public Guid GuestId { get; private set; }
    public Guid AuthorStaffId { get; private set; }
    public string Body { get; private set; } = default!;
    public NoteColor Color { get; private set; }
    public bool IsPinned { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    private Note() { }

    public Note(Guid guestId, Guid authorStaffId, string body, NoteColor color, bool isPinned)
    {
        GuestId = guestId;
        AuthorStaffId = authorStaffId;
        Body = body;
        Color = color;
        IsPinned = isPinned;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public void Pin() => IsPinned = true;
    public void Unpin() => IsPinned = false;
}
