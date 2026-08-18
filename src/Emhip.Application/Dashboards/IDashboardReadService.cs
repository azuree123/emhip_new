namespace Emhip.Application.Dashboards;

public interface IDashboardReadService
{
    Task<CmhwDashboardDto> GetCmhwDashboardAsync(Guid staffId, Guid hubId, CancellationToken cancellationToken = default);
    Task<HubManagerDashboardDto> GetHubManagerDashboardAsync(Guid hubId, CancellationToken cancellationToken = default);

    /// <summary>"Guest Seen" card: distinct guests contacted in the period, with a per-day series. Optionally scoped to one CMHW.</summary>
    Task<GuestsSeenDto> GetGuestsSeenAsync(Guid hubId, GuestsSeenPeriod period, Guid? cmhwStaffId = null, CancellationToken cancellationToken = default);
}

public enum GuestsSeenPeriod { Today = 0, Week = 1, Month = 2 }

public sealed record GuestsSeenDto(
    GuestsSeenPeriod Period,
    DateOnly From,
    DateOnly To,
    int DistinctGuestsSeen,
    int TotalContacts,
    IReadOnlyList<GuestsSeenPointDto> Series);

public sealed record GuestsSeenPointDto(DateOnly Date, int GuestsSeen);
