using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.CustomFields;

public sealed record CustomFieldDefinitionDto(
    Guid Id,
    CustomFieldEntityType EntityType,
    string Key,
    string Label,
    CustomFieldType FieldType,
    IReadOnlyList<string> Options,
    string? HelpText,
    bool IsRequired,
    int SortOrder,
    bool IsActive,
    /// <summary>How many records already hold a value — a definition with values can only be deactivated.</summary>
    int ValueCount);

/// <summary>A definition paired with the current record's value, ready to render one form control.</summary>
public sealed record CustomFieldValueDto(
    Guid DefinitionId,
    string Key,
    string Label,
    CustomFieldType FieldType,
    IReadOnlyList<string> Options,
    string? HelpText,
    bool IsRequired,
    int SortOrder,
    string? Text,
    decimal? Number,
    DateOnly? Date,
    bool? Boolean);

/// <summary>Definitions for a form. Inactive ones are included only for the Settings editor.</summary>
public sealed record GetCustomFieldDefinitionsQuery(CustomFieldEntityType? EntityType, bool IncludeInactive) : IRequest<IReadOnlyList<CustomFieldDefinitionDto>>;

public sealed class GetCustomFieldDefinitionsQueryHandler(IAppDbContext db) : IRequestHandler<GetCustomFieldDefinitionsQuery, IReadOnlyList<CustomFieldDefinitionDto>>
{
    public async Task<IReadOnlyList<CustomFieldDefinitionDto>> Handle(GetCustomFieldDefinitionsQuery request, CancellationToken cancellationToken)
    {
        var query = db.CustomFieldDefinitions.AsNoTracking();
        if (request.EntityType is not null) query = query.Where(d => d.EntityType == request.EntityType);
        if (!request.IncludeInactive) query = query.Where(d => d.IsActive);

        var definitions = await query
            .OrderBy(d => d.EntityType).ThenBy(d => d.SortOrder).ThenBy(d => d.Label)
            .Select(d => new
            {
                d.Id, d.EntityType, d.Key, d.Label, d.FieldType, d.Options, d.HelpText,
                d.IsRequired, d.SortOrder, d.IsActive,
                ValueCount = db.CustomFieldValues.Count(v => v.DefinitionId == d.Id),
            })
            .ToListAsync(cancellationToken);

        return definitions
            .Select(d => new CustomFieldDefinitionDto(
                d.Id, d.EntityType, d.Key, d.Label, d.FieldType, SplitOptions(d.Options), d.HelpText,
                d.IsRequired, d.SortOrder, d.IsActive, d.ValueCount))
            .ToList();
    }

    internal static IReadOnlyList<string> SplitOptions(string? options) =>
        string.IsNullOrWhiteSpace(options)
            ? []
            : options.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}

/// <summary>Active definitions for a form, merged with whatever the given record has stored.</summary>
public sealed record GetCustomFieldValuesQuery(CustomFieldEntityType EntityType, Guid EntityId) : IRequest<IReadOnlyList<CustomFieldValueDto>>;

public sealed class GetCustomFieldValuesQueryHandler(IAppDbContext db) : IRequestHandler<GetCustomFieldValuesQuery, IReadOnlyList<CustomFieldValueDto>>
{
    public async Task<IReadOnlyList<CustomFieldValueDto>> Handle(GetCustomFieldValuesQuery request, CancellationToken cancellationToken)
    {
        var definitions = await db.CustomFieldDefinitions.AsNoTracking()
            .Where(d => d.EntityType == request.EntityType && d.IsActive)
            .OrderBy(d => d.SortOrder).ThenBy(d => d.Label)
            .ToListAsync(cancellationToken);

        if (definitions.Count == 0) return [];

        var values = await db.CustomFieldValues.AsNoTracking()
            .Where(v => v.EntityType == request.EntityType && v.EntityId == request.EntityId)
            .ToListAsync(cancellationToken);

        return definitions
            .Select(d =>
            {
                var value = values.FirstOrDefault(v => v.DefinitionId == d.Id);
                return new CustomFieldValueDto(
                    d.Id, d.Key, d.Label, d.FieldType, d.OptionList(), d.HelpText, d.IsRequired, d.SortOrder,
                    value?.ValueText, value?.ValueNumber, value?.ValueDate, value?.ValueBoolean);
            })
            .ToList();
    }
}

public sealed record CreateCustomFieldCommand(
    CustomFieldEntityType EntityType, string Label, CustomFieldType FieldType,
    IReadOnlyList<string>? Options, string? HelpText, bool IsRequired) : IRequest<Guid>;

public sealed class CreateCustomFieldCommandValidator : AbstractValidator<CreateCustomFieldCommand>
{
    public CreateCustomFieldCommandValidator()
    {
        RuleFor(x => x.Label).NotEmpty().MaximumLength(150);
        RuleFor(x => x.HelpText).MaximumLength(500);
        RuleFor(x => x.Options)
            .Must(o => o is { Count: > 0 })
            .When(x => x.FieldType is CustomFieldType.Select or CustomFieldType.MultiSelect)
            .WithMessage("Choice fields need at least one option.");
    }
}

public sealed class CreateCustomFieldCommandHandler(IAppDbContext db) : IRequestHandler<CreateCustomFieldCommand, Guid>
{
    public async Task<Guid> Handle(CreateCustomFieldCommand request, CancellationToken cancellationToken)
    {
        var key = await UniqueKeyAsync(db, request.EntityType, request.Label, cancellationToken);

        var sortOrder = await db.CustomFieldDefinitions
            .Where(d => d.EntityType == request.EntityType)
            .MaxAsync(d => (int?)d.SortOrder, cancellationToken) ?? 0;

        var definition = new CustomFieldDefinition(
            request.EntityType, key, request.Label, request.FieldType,
            JoinOptions(request.Options), request.HelpText, request.IsRequired, sortOrder + 1);

        db.CustomFieldDefinitions.Add(definition);
        await db.SaveChangesAsync(cancellationToken);
        return definition.Id;
    }

    /// <summary>"Preferred pronoun" -> "preferred-pronoun", suffixed if that slug is taken.</summary>
    private static async Task<string> UniqueKeyAsync(IAppDbContext db, CustomFieldEntityType entityType, string label, CancellationToken cancellationToken)
    {
        var slug = new string(label.ToLowerInvariant().Select(c => char.IsLetterOrDigit(c) ? c : '-').ToArray());
        while (slug.Contains("--")) slug = slug.Replace("--", "-");
        slug = slug.Trim('-');
        if (string.IsNullOrEmpty(slug)) slug = "field";

        var existing = await db.CustomFieldDefinitions
            .Where(d => d.EntityType == entityType && d.Key.StartsWith(slug))
            .Select(d => d.Key)
            .ToListAsync(cancellationToken);

        if (!existing.Contains(slug)) return slug;

        for (var suffix = 2; ; suffix++)
        {
            var candidate = $"{slug}-{suffix}";
            if (!existing.Contains(candidate)) return candidate;
        }
    }

    internal static string? JoinOptions(IReadOnlyList<string>? options) =>
        options is null || options.Count == 0 ? null : string.Join('\n', options.Select(o => o.Trim()).Where(o => o.Length > 0));
}

public sealed record UpdateCustomFieldCommand(
    Guid Id, string Label, CustomFieldType FieldType, IReadOnlyList<string>? Options,
    string? HelpText, bool IsRequired, int SortOrder, bool IsActive) : IRequest;

public sealed class UpdateCustomFieldCommandValidator : AbstractValidator<UpdateCustomFieldCommand>
{
    public UpdateCustomFieldCommandValidator()
    {
        RuleFor(x => x.Label).NotEmpty().MaximumLength(150);
        RuleFor(x => x.HelpText).MaximumLength(500);
    }
}

public sealed class UpdateCustomFieldCommandHandler(IAppDbContext db) : IRequestHandler<UpdateCustomFieldCommand>
{
    public async Task Handle(UpdateCustomFieldCommand request, CancellationToken cancellationToken)
    {
        var definition = await db.CustomFieldDefinitions.FirstOrDefaultAsync(d => d.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Custom field {request.Id} not found.");

        // Changing the storage type of a field that already holds data would silently strand it.
        if (definition.FieldType != request.FieldType)
        {
            var hasValues = await db.CustomFieldValues.AnyAsync(v => v.DefinitionId == definition.Id, cancellationToken);
            if (hasValues)
            {
                throw new InvalidOperationException(
                    "This field already holds data, so its type can't be changed. Deactivate it and add a new field instead.");
            }
        }

        definition.Update(
            request.Label, request.FieldType, CreateCustomFieldCommandHandler.JoinOptions(request.Options),
            request.HelpText, request.IsRequired, request.SortOrder, request.IsActive);

        await db.SaveChangesAsync(cancellationToken);
    }
}

public sealed record DeleteCustomFieldResult(bool Deleted, string Message);

/// <summary>Removes an unused field outright; deactivates it instead once data exists.</summary>
public sealed record DeleteCustomFieldCommand(Guid Id) : IRequest<DeleteCustomFieldResult>;

public sealed class DeleteCustomFieldCommandHandler(IAppDbContext db) : IRequestHandler<DeleteCustomFieldCommand, DeleteCustomFieldResult>
{
    public async Task<DeleteCustomFieldResult> Handle(DeleteCustomFieldCommand request, CancellationToken cancellationToken)
    {
        var definition = await db.CustomFieldDefinitions.FirstOrDefaultAsync(d => d.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Custom field {request.Id} not found.");

        var valueCount = await db.CustomFieldValues.CountAsync(v => v.DefinitionId == definition.Id, cancellationToken);
        if (valueCount > 0)
        {
            definition.Update(definition.Label, definition.FieldType, definition.Options, definition.HelpText,
                definition.IsRequired, definition.SortOrder, isActive: false);
            await db.SaveChangesAsync(cancellationToken);

            return new DeleteCustomFieldResult(false,
                $"“{definition.Label}” holds data on {valueCount} record(s), so it was hidden from forms instead of deleted. Existing answers are kept.");
        }

        db.CustomFieldDefinitions.Remove(definition);
        await db.SaveChangesAsync(cancellationToken);
        return new DeleteCustomFieldResult(true, $"“{definition.Label}” was deleted.");
    }
}

public sealed record ReorderCustomFieldsCommand(CustomFieldEntityType EntityType, IReadOnlyList<Guid> OrderedIds) : IRequest;

public sealed class ReorderCustomFieldsCommandHandler(IAppDbContext db) : IRequestHandler<ReorderCustomFieldsCommand>
{
    public async Task Handle(ReorderCustomFieldsCommand request, CancellationToken cancellationToken)
    {
        var definitions = await db.CustomFieldDefinitions
            .Where(d => d.EntityType == request.EntityType)
            .ToListAsync(cancellationToken);

        for (var index = 0; index < request.OrderedIds.Count; index++)
        {
            var definition = definitions.FirstOrDefault(d => d.Id == request.OrderedIds[index]);
            definition?.Update(definition.Label, definition.FieldType, definition.Options, definition.HelpText,
                definition.IsRequired, index + 1, definition.IsActive);
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}

public sealed record CustomFieldEntry(Guid DefinitionId, string? Text, decimal? Number, DateOnly? Date, bool? Boolean);

/// <summary>
/// Upserts the custom-field answers for one record. Empty answers delete their row rather than
/// storing blanks, so "no answer" and "answered with nothing" don't drift apart.
/// </summary>
public sealed record SaveCustomFieldValuesCommand(CustomFieldEntityType EntityType, Guid EntityId, IReadOnlyList<CustomFieldEntry> Entries) : IRequest;

public sealed class SaveCustomFieldValuesCommandHandler(IAppDbContext db, ICurrentUser currentUser) : IRequestHandler<SaveCustomFieldValuesCommand>
{
    public async Task Handle(SaveCustomFieldValuesCommand request, CancellationToken cancellationToken)
    {
        var definitions = await db.CustomFieldDefinitions
            .Where(d => d.EntityType == request.EntityType && d.IsActive)
            .ToListAsync(cancellationToken);

        var existing = await db.CustomFieldValues
            .Where(v => v.EntityType == request.EntityType && v.EntityId == request.EntityId)
            .ToListAsync(cancellationToken);

        foreach (var definition in definitions)
        {
            var entry = request.Entries.FirstOrDefault(e => e.DefinitionId == definition.Id);
            var row = existing.FirstOrDefault(v => v.DefinitionId == definition.Id);

            var isEmpty = entry is null
                || (string.IsNullOrWhiteSpace(entry.Text) && entry.Number is null && entry.Date is null && entry.Boolean is null);

            if (isEmpty)
            {
                if (definition.IsRequired)
                {
                    throw new InvalidOperationException($"“{definition.Label}” is required.");
                }

                if (row is not null) db.CustomFieldValues.Remove(row);
                continue;
            }

            Validate(definition, entry!);

            row ??= AddRow(db, definition.Id, request.EntityType, request.EntityId);
            row.Set(entry!.Text, entry.Number, entry.Date, entry.Boolean, currentUser.StaffId);
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private static CustomFieldValue AddRow(IAppDbContext db, Guid definitionId, CustomFieldEntityType entityType, Guid entityId)
    {
        var row = new CustomFieldValue(definitionId, entityType, entityId);
        db.CustomFieldValues.Add(row);
        return row;
    }

    /// <summary>Keeps the stored shape honest: the right column filled, and choices from the defined list.</summary>
    private static void Validate(CustomFieldDefinition definition, CustomFieldEntry entry)
    {
        switch (definition.FieldType)
        {
            case CustomFieldType.Number when entry.Number is null:
                throw new InvalidOperationException($"“{definition.Label}” must be a number.");
            case CustomFieldType.Date when entry.Date is null:
                throw new InvalidOperationException($"“{definition.Label}” must be a date.");
            case CustomFieldType.Boolean when entry.Boolean is null:
                throw new InvalidOperationException($"“{definition.Label}” must be yes or no.");
            case CustomFieldType.Select or CustomFieldType.MultiSelect:
            {
                var allowed = definition.OptionList();
                var chosen = (entry.Text ?? string.Empty)
                    .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

                var unknown = chosen.Where(c => !allowed.Contains(c, StringComparer.OrdinalIgnoreCase)).ToList();
                if (unknown.Count > 0)
                {
                    throw new InvalidOperationException($"“{definition.Label}” does not offer: {string.Join(", ", unknown)}.");
                }

                if (definition.FieldType == CustomFieldType.Select && chosen.Length > 1)
                {
                    throw new InvalidOperationException($"“{definition.Label}” only accepts one choice.");
                }

                break;
            }
        }
    }
}
