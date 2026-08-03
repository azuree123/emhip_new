using Emhip.Application.Abstractions;

namespace Emhip.Workers;

/// <summary>
/// <see cref="ICurrentUser"/> for the background workers host. Unlike the API — where the current
/// user comes from the request's JWT — worker sweeps (outbox relay, escalation, report
/// materialization, follow-up scheduling) run with no signed-in staff member, so "who did this"
/// audit stamping is attributed to a system identity. This is required because
/// <c>AddInfrastructure</c> registers the audit/outbox <c>SaveChanges</c> interceptors, which
/// depend on <see cref="ICurrentUser"/>; without a registration the workers' DbContext can't be
/// activated.
/// </summary>
public sealed class SystemCurrentUser : ICurrentUser
{
    public Guid StaffId => Guid.Empty;
    public Guid HubId => Guid.Empty;
    public string DisplayName => "System (Workers)";
    public IReadOnlyList<string> Roles => [];
    public IReadOnlyList<string> Permissions => [];
}
