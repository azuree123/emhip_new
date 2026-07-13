using Emhip.Domain.Enums;

namespace Emhip.Infrastructure.ReadModels;

/// <summary>
/// One row per (hub, category, month) — the columnstore-backed reporting table described in
/// ARCHITECTURE.md. Incrementally refreshed by ReportMaterializerWorker.
/// </summary>
public class PathwayReportAggregate
{
    public Guid Id { get; set; }
    public Guid HubId { get; set; }
    public PathwayCategory Category { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public int ReferralCount { get; set; }
}
