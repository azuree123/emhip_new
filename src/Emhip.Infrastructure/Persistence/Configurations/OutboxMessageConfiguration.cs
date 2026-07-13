using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Emhip.Infrastructure.Persistence.Configurations;

public class OutboxMessageConfiguration : IEntityTypeConfiguration<OutboxMessage>
{
    public void Configure(EntityTypeBuilder<OutboxMessage> builder)
    {
        builder.ToTable("OutboxMessages");
        builder.HasKey(o => o.Id);
        builder.Property(o => o.Type).HasMaxLength(200).IsRequired();
        builder.Property(o => o.Payload).IsRequired();
        builder.Property(o => o.Error).HasMaxLength(2000);

        // OutboxRelayWorker polls WHERE ProcessedAt IS NULL ORDER BY OccurredAt.
        builder.HasIndex(o => o.ProcessedAt).HasDatabaseName("IX_OutboxMessages_Unprocessed").HasFilter("[ProcessedAt] IS NULL");
    }
}
