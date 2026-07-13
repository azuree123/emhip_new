using System.Text;
using System.Text.Json;

namespace Emhip.Application.Common;

/// <summary>
/// Opaque, base64url-encoded cursor carrying the last row's sort-key tuple, e.g.
/// (LastName, GuestId). Callers must treat it as opaque; only this type knows the shape.
/// </summary>
public static class KeysetCursor
{
    public static string Encode<T>(T cursor)
    {
        var json = JsonSerializer.Serialize(cursor);
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(json)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    public static T? Decode<T>(string? cursor)
    {
        if (string.IsNullOrWhiteSpace(cursor)) return default;
        var padded = cursor.Replace('-', '+').Replace('_', '/');
        padded = padded.PadRight(padded.Length + (4 - padded.Length % 4) % 4, '=');
        var json = Encoding.UTF8.GetString(Convert.FromBase64String(padded));
        return JsonSerializer.Deserialize<T>(json);
    }
}
