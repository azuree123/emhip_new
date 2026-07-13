using Emhip.Infrastructure.ReadModels;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Emhip.Infrastructure.Persistence.Configurations;

public class UrgentCaseReadModelConfiguration : IEntityTypeConfiguration<UrgentCaseReadModel>
{
    public void Configure(EntityTypeBuilder<UrgentCaseReadModel> builder)
    {
        builder.ToTable("UrgentCases_ReadModel");
        builder.HasKey(u => u.GuestId);
        builder.Property(u => u.GuestName).HasMaxLength(200);
        builder.Property(u => u.AssignedCmhwName).HasMaxLength(200);
        builder.HasIndex(u => new { u.HubId, u.IsActive }).HasDatabaseName("IX_UrgentCases_HubId_Active");
    }
}
