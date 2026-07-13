using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Emhip.Infrastructure.Persistence.Configurations;

public class NoteConfiguration : IEntityTypeConfiguration<Note>
{
    public void Configure(EntityTypeBuilder<Note> builder)
    {
        builder.ToTable("Notes");
        builder.HasKey(n => n.Id);
        builder.Property(n => n.Body).HasMaxLength(2000).IsRequired();
        builder.Property(n => n.Color).HasConversion<string>().HasMaxLength(20);
        builder.HasIndex(n => new { n.GuestId, n.IsPinned, n.CreatedAt }).HasDatabaseName("IX_Notes_GuestId_Pinned_CreatedAt");
    }
}
