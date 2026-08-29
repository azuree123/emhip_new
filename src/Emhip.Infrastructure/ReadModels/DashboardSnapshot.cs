namespace Emhip.Infrastructure.ReadModels;

/// <summary>
/// One row per hub, refreshed nightly + incrementally by ReportMaterializerWorker.
/// Backs both Dashboard (CMHW) and Service Overview (Hub Manager) screens.
/// </summary>
public class DashboardSnapshot
{
    public Guid HubId { get; set; }
    public int TotalActiveGuests { get; set; }
    public int PendingConversationGuests { get; set; }
    public int InactiveGuests { get; set; }
    public int UrgentGuests { get; set; }
    public int TotalGuestsAcrossHub { get; set; }

    /// <summary>JSON-serialized IReadOnlyList&lt;PathwayDistributionDto&gt;.</summary>
    public string PathwayDistributionJson { get; set; } = "[]";

    /// <summary>JSON-serialized IReadOnlyList&lt;MonthlyStatDto&gt;.</summary>
    public string MonthlyStatsJson { get; set; } = "[]";

    /// <summary>JSON-serialized IReadOnlyList&lt;ClinicalIndicatorDto&gt; — see ReportMaterializerWorker.</summary>
    public string ClinicalComplexityJson { get; set; } = "[]";

    /// <summary>Guest demographics card: ethnicity, age bands and country of origin breakdowns.</summary>
    public string DemographicsJson { get; set; } = "{}";

    /// <summary>Data quality issues card — the same checks as the Data Quality report.</summary>
    public string DataQualityJson { get; set; } = "[]";

    public DateTimeOffset RefreshedAt { get; set; }
}
