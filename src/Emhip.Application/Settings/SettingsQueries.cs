using Emhip.Application.Abstractions;
using Emhip.Domain.Enums;
using MediatR;

namespace Emhip.Application.Settings;

/// <summary>
/// One editable setting as rendered by the Settings page. Secrets never travel to the browser:
/// <see cref="Value"/> is null for them and <see cref="HasValue"/> says whether one is stored.
/// </summary>
public sealed record SettingFieldDto(
    string Key,
    string Section,
    string Label,
    string? Description,
    string Kind,
    string? Value,
    string? Default,
    bool IsSecret,
    bool HasValue,
    IReadOnlyList<SettingOption>? Options,
    string? VisibleWhenKey,
    IReadOnlyList<string>? VisibleWhenValues);

public sealed record SettingsSectionDto(string Section, IReadOnlyList<SettingFieldDto> Fields);

public sealed record GetSettingsQuery : IRequest<IReadOnlyList<SettingsSectionDto>>;

public sealed class GetSettingsQueryHandler(IAppSettingsService settings) : IRequestHandler<GetSettingsQuery, IReadOnlyList<SettingsSectionDto>>
{
    public async Task<IReadOnlyList<SettingsSectionDto>> Handle(GetSettingsQuery request, CancellationToken cancellationToken)
    {
        var stored = await settings.GetAllAsync(cancellationToken);

        return SettingsCatalog.All
            .GroupBy(d => d.Section)
            .Select(group => new SettingsSectionDto(
                group.Key,
                group.Select(d =>
                {
                    var hasStored = stored.TryGetValue(d.Key, out var value) && !string.IsNullOrEmpty(value);
                    var isSecret = d.Kind == SettingKind.Secret;
                    return new SettingFieldDto(
                        d.Key, d.Section, d.Label, d.Description, d.Kind.ToString(),
                        isSecret ? null : (hasStored ? value : d.Default),
                        isSecret ? null : d.Default,
                        isSecret, hasStored,
                        d.Options, d.VisibleWhenKey, d.VisibleWhenValues);
                }).ToList()))
            .ToList();
    }
}

/// <summary>Non-secret settings the SPA reads on startup to drive display and defaults.</summary>
public sealed record GetPublicSettingsQuery : IRequest<IReadOnlyDictionary<string, string?>>;

public sealed class GetPublicSettingsQueryHandler(IAppSettingsService settings) : IRequestHandler<GetPublicSettingsQuery, IReadOnlyDictionary<string, string?>>
{
    public async Task<IReadOnlyDictionary<string, string?>> Handle(GetPublicSettingsQuery request, CancellationToken cancellationToken)
    {
        var stored = await settings.GetAllAsync(cancellationToken);
        return SettingsCatalog.PublicKeys.ToDictionary(
            key => key,
            key => stored.TryGetValue(key, out var value) && !string.IsNullOrEmpty(value) ? value : SettingsCatalog.DefaultFor(key));
    }
}

/// <summary>
/// Saves setting overrides. Unknown keys are ignored, and a secret submitted as null/empty keeps
/// its existing value (the UI never receives secrets, so it can't echo them back).
/// </summary>
public sealed record UpdateSettingsCommand(IReadOnlyDictionary<string, string?> Values) : IRequest;

public sealed class UpdateSettingsCommandHandler(IAppSettingsService settings, ICurrentUser currentUser) : IRequestHandler<UpdateSettingsCommand>
{
    public async Task Handle(UpdateSettingsCommand request, CancellationToken cancellationToken)
    {
        var accepted = new Dictionary<string, string?>();

        foreach (var (key, value) in request.Values)
        {
            if (!SettingsCatalog.TryGet(key, out _)) continue;
            if (SettingsCatalog.IsSecret(key) && string.IsNullOrEmpty(value)) continue;
            accepted[key] = value;
        }

        if (accepted.Count == 0) return;
        await settings.SaveAsync(accepted, currentUser.StaffId, cancellationToken);
    }
}

public sealed record StorageTestResultDto(bool Success, string Message);

/// <summary>
/// "Test connection" on the Settings page. Values not supplied fall back to what's saved, so an
/// admin can verify stored credentials without re-entering them.
/// </summary>
public sealed record TestStorageConnectionCommand(DocumentStorageProvider Provider, IReadOnlyDictionary<string, string?> Values)
    : IRequest<StorageTestResultDto>;

public sealed class TestStorageConnectionCommandHandler(IDocumentStorageFactory storageFactory)
    : IRequestHandler<TestStorageConnectionCommand, StorageTestResultDto>
{
    public async Task<StorageTestResultDto> Handle(TestStorageConnectionCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var storage = await storageFactory.BuildAsync(request.Provider, request.Values, cancellationToken);
            await storage.TestAsync(cancellationToken);
            return new StorageTestResultDto(true, $"Connected to {request.Provider} successfully — test object written and removed.");
        }
        catch (Exception ex)
        {
            return new StorageTestResultDto(false, ex.Message);
        }
    }
}
