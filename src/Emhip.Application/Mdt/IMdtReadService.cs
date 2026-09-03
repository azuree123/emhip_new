namespace Emhip.Application.Mdt;

public interface IMdtReadService
{
    /// <summary>The hub's queue: every pending item, plus the last <paramref name="reviewedTake"/> reviewed ones.</summary>
    Task<MdtQueueDto> GetQueueAsync(Guid hubId, int reviewedTake = 30, CancellationToken cancellationToken = default);

    /// <summary>The CPN Record tab for one guest.</summary>
    Task<GuestCpnRecordDto> GetGuestCpnRecordAsync(Guid guestId, CancellationToken cancellationToken = default);
}
