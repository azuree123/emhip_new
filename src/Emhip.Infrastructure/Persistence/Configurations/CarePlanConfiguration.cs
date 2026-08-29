using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Emhip.Infrastructure.Persistence.Configurations;

public class CarePlanConfiguration : IEntityTypeConfiguration<CarePlan>
{
    public void Configure(EntityTypeBuilder<CarePlan> builder)
    {
        builder.ToTable("CarePlans");
        builder.HasKey(p => p.Id);
        // One active plan per guest is the invariant the command relies on.
        builder.HasIndex(p => new { p.GuestId, p.Status }).HasDatabaseName("IX_CarePlans_Guest_Status");
        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.Summary).HasMaxLength(4000);
        builder.Property(p => p.GuestVoice).HasMaxLength(4000);
        builder.Property(p => p.SupportArrangements).HasMaxLength(4000);
        builder.Property(p => p.RowVersion).IsRowVersion();
    }
}

public class CarePlanGoalConfiguration : IEntityTypeConfiguration<CarePlanGoal>
{
    public void Configure(EntityTypeBuilder<CarePlanGoal> builder)
    {
        builder.ToTable("CarePlanGoals");
        builder.HasKey(g => g.Id);
        builder.HasIndex(g => new { g.CarePlanId, g.SortOrder });
        builder.Property(g => g.Description).HasMaxLength(500).IsRequired();
        builder.Property(g => g.ProgressNote).HasMaxLength(2000);
        builder.Property(g => g.Status).HasConversion<string>().HasMaxLength(20);
    }
}
