using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Emhip.Infrastructure.Persistence.Configurations;

public class RiskAssessmentConfiguration : IEntityTypeConfiguration<RiskAssessment>
{
    public void Configure(EntityTypeBuilder<RiskAssessment> builder)
    {
        builder.ToTable("RiskAssessments");
        // Append-only: no updates or deletes issued against this table by application code.
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Notes).HasMaxLength(4000);
        builder.HasIndex(r => new { r.GuestId, r.Version }).IsUnique().HasDatabaseName("IX_RiskAssessments_GuestId_Version");
        builder.Ignore(r => r.DomainEvents);
    }
}
