using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Lookups;

public sealed record LookupItemDto(Guid Id, string Category, string Code, string Label, int SortOrder, bool IsActive, bool IsSystem);

/// <summary>All lookup categories with their items — powers both the Settings editor and the app's dropdowns.</summary>
public sealed record GetLookupsQuery(string? Category, bool IncludeInactive) : IRequest<IReadOnlyList<LookupItemDto>>;

public sealed class GetLookupsQueryHandler(IAppDbContext db) : IRequestHandler<GetLookupsQuery, IReadOnlyList<LookupItemDto>>
{
    public async Task<IReadOnlyList<LookupItemDto>> Handle(GetLookupsQuery request, CancellationToken cancellationToken)
    {
        var query = db.LookupItems.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(request.Category)) query = query.Where(l => l.Category == request.Category);
        if (!request.IncludeInactive) query = query.Where(l => l.IsActive);

        return await query
            .OrderBy(l => l.Category).ThenBy(l => l.SortOrder).ThenBy(l => l.Label)
            .Select(l => new LookupItemDto(l.Id, l.Category, l.Code, l.Label, l.SortOrder, l.IsActive, l.IsSystem))
            .ToListAsync(cancellationToken);
    }
}

public sealed record CreateLookupItemCommand(string Category, string Code, string Label, int SortOrder) : IRequest<Guid>;

public sealed class CreateLookupItemCommandValidator : AbstractValidator<CreateLookupItemCommand>
{
    public CreateLookupItemCommandValidator()
    {
        RuleFor(x => x.Category).NotEmpty().MaximumLength(60);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(60);
        RuleFor(x => x.Label).NotEmpty().MaximumLength(150);
    }
}

public sealed class CreateLookupItemCommandHandler(IAppDbContext db) : IRequestHandler<CreateLookupItemCommand, Guid>
{
    public async Task<Guid> Handle(CreateLookupItemCommand request, CancellationToken cancellationToken)
    {
        var exists = await db.LookupItems
            .AnyAsync(l => l.Category == request.Category && l.Code == request.Code, cancellationToken);
        if (exists) throw new InvalidOperationException($"'{request.Code}' already exists in {request.Category}.");

        var item = new LookupItem(request.Category, request.Code, request.Label, request.SortOrder);
        db.LookupItems.Add(item);
        await db.SaveChangesAsync(cancellationToken);
        return item.Id;
    }
}

public sealed record UpdateLookupItemCommand(Guid Id, string Label, int SortOrder, bool IsActive) : IRequest;

public sealed class UpdateLookupItemCommandValidator : AbstractValidator<UpdateLookupItemCommand>
{
    public UpdateLookupItemCommandValidator() => RuleFor(x => x.Label).NotEmpty().MaximumLength(150);
}

public sealed class UpdateLookupItemCommandHandler(IAppDbContext db) : IRequestHandler<UpdateLookupItemCommand>
{
    public async Task Handle(UpdateLookupItemCommand request, CancellationToken cancellationToken)
    {
        var item = await db.LookupItems.FirstOrDefaultAsync(l => l.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Lookup item {request.Id} not found.");

        item.Update(request.Label, request.SortOrder, request.IsActive);
        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Deletes a custom item. Seeded (system) items can only be deactivated — records may reference them.</summary>
public sealed record DeleteLookupItemCommand(Guid Id) : IRequest;

public sealed class DeleteLookupItemCommandHandler(IAppDbContext db) : IRequestHandler<DeleteLookupItemCommand>
{
    public async Task Handle(DeleteLookupItemCommand request, CancellationToken cancellationToken)
    {
        var item = await db.LookupItems.FirstOrDefaultAsync(l => l.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Lookup item {request.Id} not found.");

        if (item.IsSystem)
        {
            throw new InvalidOperationException("Built-in options cannot be deleted — deactivate them instead.");
        }

        db.LookupItems.Remove(item);
        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Applies a new display order for one category in a single round-trip.</summary>
public sealed record ReorderLookupItemsCommand(string Category, IReadOnlyList<Guid> OrderedIds) : IRequest;

public sealed class ReorderLookupItemsCommandHandler(IAppDbContext db) : IRequestHandler<ReorderLookupItemsCommand>
{
    public async Task Handle(ReorderLookupItemsCommand request, CancellationToken cancellationToken)
    {
        var items = await db.LookupItems
            .Where(l => l.Category == request.Category)
            .ToListAsync(cancellationToken);

        for (var index = 0; index < request.OrderedIds.Count; index++)
        {
            var item = items.FirstOrDefault(i => i.Id == request.OrderedIds[index]);
            item?.Update(item.Label, index + 1, item.IsActive);
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
