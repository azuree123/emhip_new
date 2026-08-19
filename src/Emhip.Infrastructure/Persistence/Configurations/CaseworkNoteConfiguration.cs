using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Emhip.Infrastructure.Persistence.Configurations;

public class CaseworkNoteConfiguration : IEntityTypeConfiguration<CaseworkNote>
{
    public void Configure(EntityTypeBuilder<CaseworkNote> builder)
    {
        builder.ToTable("CaseworkNotes");
        builder.HasKey(n => n.Id);
        builder.HasIndex(n => new { n.GuestId, n.OccurredAt }).HasDatabaseName("IX_CaseworkNotes_Guest_Occurred");
        // Drafts are looked up per author so a worker can resume their own unfinished note.
        builder.HasIndex(n => new { n.AuthorStaffId, n.Status });

        builder.Property(n => n.Category).HasConversion<string>().HasMaxLength(20);
        builder.Property(n => n.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(n => n.ContactMethod).HasConversion<string>().HasMaxLength(30);
        builder.Property(n => n.RiskLevel).HasConversion<string>().HasMaxLength(20);
        builder.Property(n => n.Situation).HasMaxLength(4000);
        builder.Property(n => n.Background).HasMaxLength(4000);
        builder.Property(n => n.Assessment).HasMaxLength(4000);
        builder.Property(n => n.Recommendation).HasMaxLength(4000);
        builder.Property(n => n.GuestReportedChanges).HasMaxLength(2000);
        builder.Property(n => n.ServiceInvolvementChanges).HasMaxLength(2000);
        builder.Property(n => n.AdditionalNotes).HasMaxLength(4000);
        builder.Property(n => n.RowVersion).IsRowVersion();
    }
}

public class PathwayChangeConfiguration : IEntityTypeConfiguration<PathwayChange>
{
    public void Configure(EntityTypeBuilder<PathwayChange> builder)
    {
        builder.ToTable("PathwayChanges");
        builder.HasKey(c => c.Id);
        builder.HasIndex(c => new { c.GuestId, c.ChangedOn }).HasDatabaseName("IX_PathwayChanges_Guest_ChangedOn");
        builder.Property(c => c.FromPathway).HasConversion<string>().HasMaxLength(30);
        builder.Property(c => c.ToPathway).HasConversion<string>().HasMaxLength(30);
        builder.Property(c => c.Reason).HasMaxLength(2000);
        builder.Property(c => c.AssignedByName).HasMaxLength(200);
    }
}
