namespace Emhip.Application.Common;

/// <summary>
/// A page of results from keyset (cursor) pagination — never offset/skip. See
/// ARCHITECTURE.md: "Offset paging degrades past ~100k rows; the Guest List and
/// Follow-up queue must use keyset."
/// </summary>
public sealed class KeysetPage<T>
{
    public required IReadOnlyList<T> Items { get; init; }
    public required string? NextCursor { get; init; }
    public required bool HasMore { get; init; }
}
