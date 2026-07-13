using Emhip.Application.Common;
using Xunit;

namespace Emhip.UnitTests.Common;

public class KeysetCursorTests
{
    private sealed record Cursor(string LastName, string FirstName, Guid Id);

    [Fact]
    public void Encode_then_decode_round_trips()
    {
        var original = new Cursor("Smith", "Jo", Guid.NewGuid());

        var encoded = KeysetCursor.Encode(original);
        var decoded = KeysetCursor.Decode<Cursor>(encoded);

        Assert.Equal(original, decoded);
    }

    [Fact]
    public void Encoded_cursor_is_url_safe()
    {
        var encoded = KeysetCursor.Encode(new Cursor("O'Brien-Smith", "Jo/Ann", Guid.NewGuid()));

        Assert.DoesNotContain('+', encoded);
        Assert.DoesNotContain('/', encoded);
        Assert.DoesNotContain('=', encoded);
    }

    [Fact]
    public void Decode_of_null_or_empty_returns_default()
    {
        Assert.Null(KeysetCursor.Decode<Cursor>(null));
        Assert.Null(KeysetCursor.Decode<Cursor>(""));
    }
}
