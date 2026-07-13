using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Emhip.Infrastructure.Persistence.Configurations;

public class CaseworkSessionConfiguration : IEntityTypeConfiguration<CaseworkSession>
{
    public void Configure(EntityTypeBuilder<CaseworkSession> builder)
    {
        builder.ToTable("CaseworkSessions");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(s => s.Location).HasMaxLength(200);
        builder.HasIndex(s => new { s.StaffId, s.ScheduledAt }).HasDatabaseName("IX_CaseworkSessions_StaffId_ScheduledAt");
        builder.HasIndex(s => s.GuestId);
    }
}
