using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Emhip.Infrastructure.Persistence.Configurations;

public class GuestDemographicsConfiguration : IEntityTypeConfiguration<GuestDemographics>
{
    public void Configure(EntityTypeBuilder<GuestDemographics> builder)
    {
        builder.ToTable("GuestDemographics");
        builder.HasKey(d => d.Id);
        builder.HasIndex(d => d.GuestId).IsUnique();
        builder.Property(d => d.Ethnicity).HasMaxLength(100);
        builder.Property(d => d.Nationality).HasMaxLength(100);
        builder.Property(d => d.PreferredLanguage).HasMaxLength(100);
        builder.Property(d => d.HousingStatus).HasMaxLength(100);
        builder.Property(d => d.EmploymentStatus).HasMaxLength(100);
        builder.Property(d => d.EmergencyContactName).HasMaxLength(200);
        builder.Property(d => d.EmergencyContactPhone).HasMaxLength(30);
        builder.Property(d => d.EmergencyContactRelationship).HasMaxLength(100);
        builder.Property(d => d.GpName).HasMaxLength(200);
        builder.Property(d => d.GpPractice).HasMaxLength(200);
        builder.Property(d => d.NhsNumber).HasMaxLength(20);
    }
}
