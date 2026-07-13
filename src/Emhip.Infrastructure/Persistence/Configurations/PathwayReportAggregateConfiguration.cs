using Emhip.Infrastructure.ReadModels;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Emhip.Infrastructure.Persistence.Configurations;

public class PathwayReportAggregateConfiguration : IEntityTypeConfiguration<PathwayReportAggregate>
{
    public void Configure(EntityTypeBuilder<PathwayReportAggregate> builder)
    {
        // Columnstore-backed in production (see ARCHITECTURE.md); a nonclustered columnstore
        // index is added via raw-SQL migration once the table carries real report volumes.
        builder.ToTable("PathwayReportAggregates_ReadModel");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Category).HasConversion<string>().HasMaxLength(40);
        builder.HasIndex(p => new { p.HubId, p.Category, p.Year, p.Month }).IsUnique().HasDatabaseName("IX_PathwayReportAggregates_Hub_Category_Period");
    }
}
