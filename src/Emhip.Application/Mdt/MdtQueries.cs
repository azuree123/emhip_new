using MediatR;

namespace Emhip.Application.Mdt;

public sealed record GetMdtQueueQuery(Guid HubId) : IRequest<MdtQueueDto>;

public sealed class GetMdtQueueQueryHandler(IMdtReadService reads) : IRequestHandler<GetMdtQueueQuery, MdtQueueDto>
{
    public Task<MdtQueueDto> Handle(GetMdtQueueQuery request, CancellationToken cancellationToken) =>
        reads.GetQueueAsync(request.HubId, 30, cancellationToken);
}

public sealed record GetGuestCpnRecordQuery(Guid GuestId) : IRequest<GuestCpnRecordDto>;

public sealed class GetGuestCpnRecordQueryHandler(IMdtReadService reads) : IRequestHandler<GetGuestCpnRecordQuery, GuestCpnRecordDto>
{
    public Task<GuestCpnRecordDto> Handle(GetGuestCpnRecordQuery request, CancellationToken cancellationToken) =>
        reads.GetGuestCpnRecordAsync(request.GuestId, cancellationToken);
}
