using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Emhip.Infrastructure.Persistence.Configurations;

public class PathwayReferralConfiguration : IEntityTypeConfiguration<PathwayReferral>
{
    public void Configure(EntityTypeBuilder<PathwayReferral> builder)
    {
        builder.ToTable("PathwayReferrals");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Category).HasConversion<string>().HasMaxLength(40);
        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.Detail).HasMaxLength(2000);
        builder.HasIndex(p => p.GuestId);
        builder.HasIndex(p => new { p.Category, p.ReferredAt }).HasDatabaseName("IX_PathwayReferrals_Category_ReferredAt");
    }
}
