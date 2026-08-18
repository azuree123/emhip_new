using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Emhip.Infrastructure.Persistence.Configurations;

public class GuestConfiguration : IEntityTypeConfiguration<Guest>
{
    public void Configure(EntityTypeBuilder<Guest> builder)
    {
        builder.ToTable("Guests");
        builder.HasKey(g => g.Id);

        builder.Property(g => g.FirstName).HasMaxLength(100).IsRequired();
        builder.Property(g => g.LastName).HasMaxLength(100).IsRequired();
        builder.Property(g => g.Gender).HasMaxLength(50);
        builder.Property(g => g.ContactPhone).HasMaxLength(30);
        builder.Property(g => g.ContactEmail).HasMaxLength(256);
        builder.Property(g => g.AddressLine1).HasMaxLength(200);
        builder.Property(g => g.AddressLine2).HasMaxLength(200);
        builder.Property(g => g.PostCode).HasMaxLength(20);
        builder.Property(g => g.Status).HasConversion<string>().HasMaxLength(30);
        builder.Property(g => g.Pathway).HasConversion<string>().HasMaxLength(30);
        builder.Property(g => g.RowVersion).IsRowVersion();

        builder.HasQueryFilter(g => !g.IsDeleted);

        // Keyset pagination on (HubId, LastName, FirstName, Id) — the Guest List sort order.
        builder.HasIndex(g => new { g.HubId, g.LastName, g.FirstName, g.Id }).HasDatabaseName("IX_Guests_Keyset");
        builder.HasIndex(g => new { g.HubId, g.Status }).HasDatabaseName("IX_Guests_HubId_Status");
        builder.HasIndex(g => g.AssignedCmhwId).HasDatabaseName("IX_Guests_AssignedCmhwId");
    }
}
