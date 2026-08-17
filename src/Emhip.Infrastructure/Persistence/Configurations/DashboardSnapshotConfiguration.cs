using Emhip.Infrastructure.ReadModels;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Emhip.Infrastructure.Persistence.Configurations;

public class DashboardSnapshotConfiguration : IEntityTypeConfiguration<DashboardSnapshot>
{
    public void Configure(EntityTypeBuilder<DashboardSnapshot> builder)
    {
        builder.ToTable("DashboardSnapshots_ReadModel");
        builder.HasKey(d => d.HubId);
        builder.Property(d => d.PathwayDistributionJson).HasColumnType("nvarchar(max)");
        builder.Property(d => d.MonthlyStatsJson).HasColumnType("nvarchar(max)");
        builder.Property(d => d.ClinicalComplexityJson).HasColumnType("nvarchar(max)").HasDefaultValue("[]");
    }
}
