using Emhip.Api.Auth;
using Microsoft.AspNetCore.SignalR;

namespace Emhip.Api.Hubs;

/// <summary>
/// Pushes Urgent Cases updates live. Clients join a group per hub (row-level scoping) so a
/// guest escalated at one hub never reaches another hub's dashboard. Browsers can't set custom
/// headers on the WebSocket handshake, so the hub id travels as a query-string parameter
/// (`?hubId=...`) instead of the X-Dev-Hub-Id header used by regular API calls.
/// </summary>
public sealed class UrgentCasesHub : Hub
{
    public static string GroupName(Guid hubId) => $"hub-{hubId}";

    public override async Task OnConnectedAsync()
    {
        var value = Context.GetHttpContext()?.Request.Query["hubId"].ToString();
        var hubId = Guid.TryParse(value, out var id) ? id : DevCurrentUser.DefaultHubId;

        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(hubId));
        await base.OnConnectedAsync();
    }
}
