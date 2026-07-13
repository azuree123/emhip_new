using MediatR;

namespace Emhip.Application.UrgentCases;

public sealed record GetUrgentCasesQuery(Guid HubId) : IRequest<IReadOnlyList<UrgentCaseDto>>;

public sealed class GetUrgentCasesQueryHandler(IUrgentCaseReadService reads) : IRequestHandler<GetUrgentCasesQuery, IReadOnlyList<UrgentCaseDto>>
{
    public Task<IReadOnlyList<UrgentCaseDto>> Handle(GetUrgentCasesQuery request, CancellationToken cancellationToken) =>
        reads.GetActiveUrgentCasesAsync(request.HubId, cancellationToken);
}
