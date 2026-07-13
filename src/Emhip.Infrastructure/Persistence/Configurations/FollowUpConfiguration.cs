using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Emhip.Infrastructure.Persistence.Configurations;

public class FollowUpConfiguration : IEntityTypeConfiguration<FollowUp>
{
    public void Configure(EntityTypeBuilder<FollowUp> builder)
    {
        builder.ToTable("FollowUps");
        builder.HasKey(f => f.Id);
        builder.Property(f => f.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(f => f.Notes).HasMaxLength(2000);

        // Keyset pagination on (DueDate, Id); filtered index for the overdue-queue hot subset.
        builder.HasIndex(f => new { f.DueDate, f.Id }).HasDatabaseName("IX_FollowUps_Keyset");
        builder.HasIndex(f => f.AssigneeStaffId).HasDatabaseName("IX_FollowUps_AssigneeStaffId");
        builder.HasIndex(f => f.Status)
            .HasDatabaseName("IX_FollowUps_Status_Scheduled")
            .HasFilter("[Status] = 'Scheduled'");

        builder.Ignore(f => f.DomainEvents);
    }
}
