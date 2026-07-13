using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Emhip.Infrastructure.Persistence.Configurations;

public class ContactConfiguration : IEntityTypeConfiguration<Contact>
{
    public void Configure(EntityTypeBuilder<Contact> builder)
    {
        builder.ToTable("Contacts");
        // NOTE: production deployment should partition this table by month (OccurredAt) —
        // see ARCHITECTURE.md "Partitioning & indexing". EF Core doesn't manage partition
        // functions/schemes directly; add via a raw-SQL migration once real volumes are known.
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Type).HasConversion<string>().HasMaxLength(20);
        builder.Property(c => c.Outcome).HasConversion<string>().HasMaxLength(20);
        builder.Property(c => c.Notes).HasMaxLength(2000);
        builder.HasIndex(c => new { c.GuestId, c.OccurredAt }).HasDatabaseName("IX_Contacts_GuestId_OccurredAt");
        builder.HasIndex(c => c.OccurredAt).HasDatabaseName("IX_Contacts_OccurredAt");
    }
}
