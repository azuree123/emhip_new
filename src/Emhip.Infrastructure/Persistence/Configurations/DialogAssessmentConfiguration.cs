using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Emhip.Infrastructure.Persistence.Configurations;

public class DialogAssessmentConfiguration : IEntityTypeConfiguration<DialogAssessment>
{
    public void Configure(EntityTypeBuilder<DialogAssessment> builder)
    {
        builder.ToTable("DialogAssessments");
        builder.HasKey(d => d.Id);
        builder.HasIndex(d => new { d.GuestId, d.Version }).IsUnique();
        builder.Ignore(d => d.Total);
    }
}

public class GuestActionConfiguration : IEntityTypeConfiguration<GuestAction>
{
    public void Configure(EntityTypeBuilder<GuestAction> builder)
    {
        builder.ToTable("GuestActions");
        builder.HasKey(a => a.Id);
        builder.HasIndex(a => new { a.GuestId, a.DueDate });
        builder.Property(a => a.Description).HasMaxLength(500);
    }
}

public class GuestClinicalProfileConfiguration : IEntityTypeConfiguration<GuestClinicalProfile>
{
    public void Configure(EntityTypeBuilder<GuestClinicalProfile> builder)
    {
        builder.ToTable("GuestClinicalProfiles");
        builder.HasKey(p => p.Id);
        builder.HasIndex(p => p.GuestId).IsUnique();
        builder.Property(p => p.DiagnosisGroups).HasMaxLength(500);
        builder.Property(p => p.PresentingProblem).HasMaxLength(4000);
        builder.Property(p => p.PastMhDifficulties).HasMaxLength(4000);
        builder.Property(p => p.FamilyMhHistory).HasMaxLength(4000);
        builder.Property(p => p.LongTermHealthCondition).HasMaxLength(1000);
        builder.Property(p => p.PhysicalIllness).HasMaxLength(1000);
        builder.Property(p => p.CurrentMedications).HasMaxLength(2000);
        builder.Property(p => p.MhTeamClinician).HasMaxLength(200);
        builder.Property(p => p.SocialServicesCoordinator).HasMaxLength(200);
    }
}
