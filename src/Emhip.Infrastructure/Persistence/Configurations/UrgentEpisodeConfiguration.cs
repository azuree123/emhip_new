using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Emhip.Infrastructure.Persistence.Configurations;

public class UrgentEpisodeConfiguration : IEntityTypeConfiguration<UrgentEpisode>
{
    public void Configure(EntityTypeBuilder<UrgentEpisode> builder)
    {
        builder.ToTable("UrgentEpisodes");
        builder.HasKey(e => e.Id);
        builder.HasIndex(e => new { e.GuestId, e.ResolvedAt });
        builder.HasIndex(e => e.ResolvedAt);
        builder.Property(e => e.CmhtTeam).HasMaxLength(200);
        builder.Property(e => e.EscalationReason).HasMaxLength(2000);
        builder.Property(e => e.EscalationUrgency).HasMaxLength(50);
        builder.Property(e => e.EscalationNotes).HasMaxLength(4000);
        builder.Property(e => e.ResolutionNote).HasMaxLength(4000);
    }
}

public class ExportRecordConfiguration : IEntityTypeConfiguration<ExportRecord>
{
    public void Configure(EntityTypeBuilder<ExportRecord> builder)
    {
        builder.ToTable("ExportRecords");
        builder.HasKey(e => e.Id);
        builder.HasIndex(e => new { e.HubId, e.ExportedAt });
        builder.Property(e => e.ExportType).HasMaxLength(50);
    }
}
