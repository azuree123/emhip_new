using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Emhip.Infrastructure.Persistence.Configurations;

public class CustomFieldDefinitionConfiguration : IEntityTypeConfiguration<CustomFieldDefinition>
{
    public void Configure(EntityTypeBuilder<CustomFieldDefinition> builder)
    {
        builder.ToTable("CustomFieldDefinitions");
        builder.HasKey(d => d.Id);
        builder.HasIndex(d => new { d.EntityType, d.Key }).IsUnique();
        builder.Property(d => d.EntityType).HasConversion<string>().HasMaxLength(30);
        builder.Property(d => d.FieldType).HasConversion<string>().HasMaxLength(30);
        builder.Property(d => d.Key).HasMaxLength(80).IsRequired();
        builder.Property(d => d.Label).HasMaxLength(150).IsRequired();
        builder.Property(d => d.Options).HasMaxLength(4000);
        builder.Property(d => d.HelpText).HasMaxLength(500);
    }
}

public class CustomFieldValueConfiguration : IEntityTypeConfiguration<CustomFieldValue>
{
    public void Configure(EntityTypeBuilder<CustomFieldValue> builder)
    {
        builder.ToTable("CustomFieldValues");
        builder.HasKey(v => v.Id);

        // One answer per field per record; the entity index serves the per-record form load.
        builder.HasIndex(v => new { v.DefinitionId, v.EntityId }).IsUnique();
        builder.HasIndex(v => new { v.EntityType, v.EntityId }).HasDatabaseName("IX_CustomFieldValues_Entity");

        builder.Property(v => v.EntityType).HasConversion<string>().HasMaxLength(30);
        builder.Property(v => v.ValueText).HasMaxLength(4000);
        builder.Property(v => v.ValueNumber).HasPrecision(18, 4);
    }
}
