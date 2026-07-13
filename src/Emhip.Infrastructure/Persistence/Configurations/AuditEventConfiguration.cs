using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Emhip.Infrastructure.Persistence.Configurations;

public class AuditEventConfiguration : IEntityTypeConfiguration<AuditEvent>
{
    public void Configure(EntityTypeBuilder<AuditEvent> builder)
    {
        builder.ToTable("AuditEvents");
        // NOTE: partition by month (OccurredAt) at real volumes, per ARCHITECTURE.md.
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Action).HasConversion<string>().HasMaxLength(20);
        builder.Property(a => a.EntityName).HasMaxLength(100).IsRequired();
        builder.Property(a => a.EntityId).HasMaxLength(100).IsRequired();
        builder.Property(a => a.Details).HasMaxLength(4000);
        builder.HasIndex(a => new { a.GuestId, a.OccurredAt }).HasDatabaseName("IX_AuditEvents_GuestId_OccurredAt");
        builder.HasIndex(a => a.OccurredAt).HasDatabaseName("IX_AuditEvents_OccurredAt");
    }
}
