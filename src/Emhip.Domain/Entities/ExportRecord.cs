using Emhip.Domain.Common;

namespace Emhip.Domain.Entities;

/// <summary>A row per report export — backs the reports screen's "Export history" tab.</summary>
public class ExportRecord : Entity
{
    public Guid HubId { get; private set; }
    public Guid ExportedByStaffId { get; private set; }
    public DateTimeOffset ExportedAt { get; private set; }
    public string ExportType { get; private set; } = default!;
    public DateOnly FromDate { get; private set; }
    public DateOnly ToDate { get; private set; }

    private ExportRecord() { }

    public ExportRecord(Guid hubId, Guid exportedByStaffId, string exportType, DateOnly fromDate, DateOnly toDate)
    {
        HubId = hubId;
        ExportedByStaffId = exportedByStaffId;
        ExportedAt = DateTimeOffset.UtcNow;
        ExportType = exportType;
        FromDate = fromDate;
        ToDate = toDate;
    }
}
