using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Emhip.Infrastructure.Persistence.Configurations;

public class InitialConversationRecordConfiguration : IEntityTypeConfiguration<InitialConversationRecord>
{
    public void Configure(EntityTypeBuilder<InitialConversationRecord> builder)
    {
        builder.ToTable("InitialConversationRecords");
        builder.HasKey(r => r.Id);
        builder.HasIndex(r => r.GuestId).IsUnique();
        builder.Property(r => r.PresentingIssues).HasMaxLength(4000);
        builder.Property(r => r.Notes).HasMaxLength(4000);
    }
}
