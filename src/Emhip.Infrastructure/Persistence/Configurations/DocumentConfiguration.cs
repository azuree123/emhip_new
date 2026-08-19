using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Emhip.Infrastructure.Persistence.Configurations;

public class DocumentConfiguration : IEntityTypeConfiguration<Document>
{
    public void Configure(EntityTypeBuilder<Document> builder)
    {
        builder.ToTable("Documents");
        builder.HasKey(d => d.Id);

        builder.Property(d => d.Title).HasMaxLength(250).IsRequired();
        builder.Property(d => d.Description).HasMaxLength(2000);
        builder.Property(d => d.Category).HasMaxLength(100).IsRequired();
        builder.Property(d => d.Tags).HasMaxLength(500);
        builder.Property(d => d.DeleteReason).HasMaxLength(500);
        builder.Property(d => d.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(d => d.RowVersion).IsRowVersion();

        // No global soft-delete filter here (unlike Guest): the register has a recycle-bin view,
        // so deleted rows must stay queryable and are filtered per query instead.
        builder.HasIndex(d => new { d.HubId, d.IsDeleted, d.UpdatedAt }).HasDatabaseName("IX_Documents_Hub_Deleted_Updated");
        builder.HasIndex(d => d.GuestId).HasDatabaseName("IX_Documents_GuestId");
        builder.HasIndex(d => new { d.HubId, d.Category }).HasDatabaseName("IX_Documents_Hub_Category");
    }
}

public class DocumentVersionConfiguration : IEntityTypeConfiguration<DocumentVersion>
{
    public void Configure(EntityTypeBuilder<DocumentVersion> builder)
    {
        builder.ToTable("DocumentVersions");
        builder.HasKey(v => v.Id);

        builder.HasIndex(v => new { v.DocumentId, v.VersionNumber }).IsUnique();
        builder.Property(v => v.FileName).HasMaxLength(260).IsRequired();
        builder.Property(v => v.ContentType).HasMaxLength(200).IsRequired();
        builder.Property(v => v.StorageKey).HasMaxLength(1024).IsRequired();
        builder.Property(v => v.Sha256).HasMaxLength(64).IsRequired();
        builder.Property(v => v.ChangeNote).HasMaxLength(1000);
        builder.Property(v => v.StorageProvider).HasConversion<string>().HasMaxLength(30);
    }
}

public class AppSettingConfiguration : IEntityTypeConfiguration<AppSetting>
{
    public void Configure(EntityTypeBuilder<AppSetting> builder)
    {
        builder.ToTable("AppSettings");
        builder.HasKey(s => s.Id);
        builder.HasIndex(s => s.Key).IsUnique();
        builder.Property(s => s.Key).HasMaxLength(150).IsRequired();
        builder.Property(s => s.Value).HasMaxLength(4000);
    }
}

public class EmailTemplateConfiguration : IEntityTypeConfiguration<EmailTemplate>
{
    public void Configure(EntityTypeBuilder<EmailTemplate> builder)
    {
        builder.ToTable("EmailTemplates");
        builder.HasKey(t => t.Id);
        builder.HasIndex(t => t.Key).IsUnique();
        builder.Property(t => t.Key).HasMaxLength(80).IsRequired();
        builder.Property(t => t.Name).HasMaxLength(150).IsRequired();
        builder.Property(t => t.Subject).HasMaxLength(300).IsRequired();
        builder.Property(t => t.HtmlBody).IsRequired();
    }
}

public class LookupItemConfiguration : IEntityTypeConfiguration<LookupItem>
{
    public void Configure(EntityTypeBuilder<LookupItem> builder)
    {
        builder.ToTable("LookupItems");
        builder.HasKey(l => l.Id);
        builder.HasIndex(l => new { l.Category, l.Code }).IsUnique();
        builder.Property(l => l.Category).HasMaxLength(60).IsRequired();
        builder.Property(l => l.Code).HasMaxLength(60).IsRequired();
        builder.Property(l => l.Label).HasMaxLength(150).IsRequired();
    }
}
