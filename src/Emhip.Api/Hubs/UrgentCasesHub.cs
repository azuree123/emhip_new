using Emhip.Application.Abstractions;
using Emhip.Domain.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Emhip.Api.Hubs;

/// <summary>
/// Pushes Urgent Cases updates live. Clients join a group per hub (row-level scoping) so a
/// guest escalated at one hub never reaches another hub's dashboard. The hub id is read from
/// the authenticated user's JWT (via ICurrentUser), never a client-supplied value — a caller
/// can only ever join their own hub's group.
/// </summary>
[Authorize(Policy = Permissions.UrgentCases.View)]
public sealed class UrgentCasesHub(ICurrentUser currentUser) : Hub
{
    public static string GroupName(Guid hubId) => $"hub-{hubId}";

    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(currentUser.HubId));
        await base.OnConnectedAsync();
    }
}
