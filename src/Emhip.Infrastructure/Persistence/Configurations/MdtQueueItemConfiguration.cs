using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Emhip.Infrastructure.Persistence.Configurations;

public class MdtQueueItemConfiguration : IEntityTypeConfiguration<MdtQueueItem>
{
    public void Configure(EntityTypeBuilder<MdtQueueItem> builder)
    {
        builder.ToTable("MdtQueueItems");
        builder.HasKey(i => i.Id);
        // The queue is read per hub via the guest; pending-first ordering is by RequestedAt.
        builder.HasIndex(i => new { i.GuestId, i.Kind, i.Status }).HasDatabaseName("IX_MdtQueueItems_Guest_Kind_Status");
        builder.HasIndex(i => new { i.Status, i.RequestedAt }).HasDatabaseName("IX_MdtQueueItems_Status_RequestedAt");
        builder.Property(i => i.Kind).HasConversion<string>().HasMaxLength(30);
        builder.Property(i => i.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(i => i.Reason).HasMaxLength(500).IsRequired();
        builder.Property(i => i.Details).HasMaxLength(4000);
        builder.Property(i => i.Urgency).HasMaxLength(100);
        builder.Property(i => i.ReviewNote).HasMaxLength(4000);
        builder.Property(i => i.DeclineReason).HasMaxLength(500);
        builder.Property(i => i.RowVersion).IsRowVersion();
    }
}
