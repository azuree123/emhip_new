using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Emhip.Infrastructure.Persistence.Configurations;

public class CpnInitialAssessmentConfiguration : IEntityTypeConfiguration<CpnInitialAssessment>
{
    public void Configure(EntityTypeBuilder<CpnInitialAssessment> builder)
    {
        builder.ToTable("CpnInitialAssessments");
        builder.HasKey(a => a.Id);

        // One assessment per guest — the design's "a new entry cannot be created if Part 1 already
        // exists". Enforced in the database as well as the handler so a concurrent second submit
        // cannot slip a rival baseline in.
        builder.HasIndex(a => a.GuestId).IsUnique().HasDatabaseName("IX_CpnInitialAssessments_Guest");

        builder.Property(a => a.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(a => a.ContactMethod).HasConversion<string>().HasMaxLength(30);
        builder.Property(a => a.CapacityToConsent).HasConversion<string>().HasMaxLength(20);
        builder.Property(a => a.OverallRiskRating).HasConversion<string>().HasMaxLength(20);
        builder.Property(a => a.PreviousInpatientAdmission).HasConversion<string>().HasMaxLength(10);
        builder.Property(a => a.PreviousMhaSection).HasConversion<string>().HasMaxLength(10);

        // Lookup codes, not free text.
        builder.Property(a => a.MethodOfAssessment).HasMaxLength(60);
        builder.Property(a => a.OthersPresent).HasMaxLength(60);
        builder.Property(a => a.ReferredBy).HasMaxLength(60);
        builder.Property(a => a.CurrentDiagnosis).HasMaxLength(60);
        builder.Property(a => a.FollowUpFrequency).HasMaxLength(60);

        foreach (var narrative in new[]
                 {
                     nameof(CpnInitialAssessment.ReasonForReferral), nameof(CpnInitialAssessment.CurrentMedication),
                     nameof(CpnInitialAssessment.PreviousPresentations), nameof(CpnInitialAssessment.TalkingTherapies),
                     nameof(CpnInitialAssessment.PersonalHistory), nameof(CpnInitialAssessment.FamilyMentalIllness),
                     nameof(CpnInitialAssessment.SubstanceUse), nameof(CpnInitialAssessment.SocialCircumstances),
                     nameof(CpnInitialAssessment.ClinicalFormulation), nameof(CpnInitialAssessment.RecommendedPlan),
                     nameof(CpnInitialAssessment.SafetyPlan),
                 })
        {
            builder.Property(narrative).HasMaxLength(4000);
        }

        foreach (var shorter in new[]
                 {
                     nameof(CpnInitialAssessment.DiagnosisDetail), nameof(CpnInitialAssessment.CapacityNotes),
                     nameof(CpnInitialAssessment.AppearanceAndBehaviour), nameof(CpnInitialAssessment.Speech),
                     nameof(CpnInitialAssessment.MoodSubjective), nameof(CpnInitialAssessment.MoodObjective),
                     nameof(CpnInitialAssessment.Affect), nameof(CpnInitialAssessment.ThoughtsFormAndContent),
                     nameof(CpnInitialAssessment.Perceptions), nameof(CpnInitialAssessment.Cognition),
                     nameof(CpnInitialAssessment.Insight), nameof(CpnInitialAssessment.EnergyAndSleep),
                     nameof(CpnInitialAssessment.Appetite), nameof(CpnInitialAssessment.SocialIsolation),
                 })
        {
            builder.Property(shorter).HasMaxLength(2000);
        }

        builder.HasMany(a => a.RiskDomains)
            .WithOne()
            .HasForeignKey(d => d.AssessmentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Metadata.FindNavigation(nameof(CpnInitialAssessment.RiskDomains))!
            .SetPropertyAccessMode(PropertyAccessMode.Field);

        builder.Property(a => a.RowVersion).IsRowVersion();
    }
}

public class CpnRiskDomainRatingConfiguration : IEntityTypeConfiguration<CpnRiskDomainRating>
{
    public void Configure(EntityTypeBuilder<CpnRiskDomainRating> builder)
    {
        builder.ToTable("CpnRiskDomainRatings");
        builder.HasKey(d => d.Id);
        builder.HasIndex(d => new { d.AssessmentId, d.Domain }).IsUnique();
        builder.Property(d => d.Domain).HasConversion<string>().HasMaxLength(40);
        builder.Property(d => d.Rating).HasConversion<string>().HasMaxLength(20);
        builder.Property(d => d.Notes).HasMaxLength(2000);
    }
}
