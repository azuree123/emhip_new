using Emhip.Domain.Common;

namespace Emhip.Domain.Entities;

/// <summary>A community mental-health hub. Guests and staff are scoped by hub (row-level security).</summary>
public class Hub : Entity
{
    public string Name { get; private set; } = default!;
    public string Code { get; private set; } = default!;

    private Hub() { }

    public Hub(string name, string code)
    {
        Name = name;
        Code = code;
    }
}
