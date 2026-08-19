using Emhip.Application.Abstractions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Emails;

public sealed record EmailTemplateDto(
    string Key,
    string Name,
    string Description,
    string Subject,
    string HtmlBody,
    string? TextBody,
    bool IsEnabled,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<string> Tokens);

public sealed record GetEmailTemplatesQuery : IRequest<IReadOnlyList<EmailTemplateDto>>;

public sealed class GetEmailTemplatesQueryHandler(IAppDbContext db) : IRequestHandler<GetEmailTemplatesQuery, IReadOnlyList<EmailTemplateDto>>
{
    public async Task<IReadOnlyList<EmailTemplateDto>> Handle(GetEmailTemplatesQuery request, CancellationToken cancellationToken)
    {
        var stored = await db.EmailTemplates.AsNoTracking().ToListAsync(cancellationToken);

        // Catalog order, with the code-declared description and token list attached to each row.
        return EmailTemplateCatalog.All
            .Select(definition =>
            {
                var row = stored.FirstOrDefault(t => string.Equals(t.Key, definition.Key, StringComparison.OrdinalIgnoreCase));
                return new EmailTemplateDto(
                    definition.Key,
                    definition.Name,
                    definition.Description,
                    row?.Subject ?? definition.DefaultSubject,
                    row?.HtmlBody ?? definition.DefaultHtmlBody,
                    row?.TextBody,
                    row?.IsEnabled ?? true,
                    row?.UpdatedAt ?? default,
                    [.. definition.Tokens, .. EmailTemplateCatalog.CommonTokens]);
            })
            .ToList();
    }
}

public sealed record UpdateEmailTemplateCommand(string Key, string Subject, string HtmlBody, string? TextBody, bool IsEnabled) : IRequest;

public sealed class UpdateEmailTemplateCommandValidator : AbstractValidator<UpdateEmailTemplateCommand>
{
    public UpdateEmailTemplateCommandValidator()
    {
        RuleFor(x => x.Subject).NotEmpty().MaximumLength(300);
        RuleFor(x => x.HtmlBody).NotEmpty();
    }
}

public sealed class UpdateEmailTemplateCommandHandler(IAppDbContext db, ICurrentUser currentUser) : IRequestHandler<UpdateEmailTemplateCommand>
{
    public async Task Handle(UpdateEmailTemplateCommand request, CancellationToken cancellationToken)
    {
        var definition = EmailTemplateCatalog.Find(request.Key)
            ?? throw new KeyNotFoundException($"Unknown email template '{request.Key}'.");

        var template = await db.EmailTemplates.FirstOrDefaultAsync(t => t.Key == request.Key, cancellationToken);
        if (template is null)
        {
            template = new Domain.Entities.EmailTemplate(definition.Key, definition.Name, request.Subject, request.HtmlBody, request.TextBody);
            db.EmailTemplates.Add(template);
        }

        template.Update(request.Subject, request.HtmlBody, request.TextBody, request.IsEnabled, currentUser.StaffId);
        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Restores a template to the version shipped in the catalog.</summary>
public sealed record ResetEmailTemplateCommand(string Key) : IRequest;

public sealed class ResetEmailTemplateCommandHandler(IAppDbContext db, ICurrentUser currentUser) : IRequestHandler<ResetEmailTemplateCommand>
{
    public async Task Handle(ResetEmailTemplateCommand request, CancellationToken cancellationToken)
    {
        var definition = EmailTemplateCatalog.Find(request.Key)
            ?? throw new KeyNotFoundException($"Unknown email template '{request.Key}'.");

        var template = await db.EmailTemplates.FirstOrDefaultAsync(t => t.Key == request.Key, cancellationToken);
        if (template is null)
        {
            db.EmailTemplates.Add(new Domain.Entities.EmailTemplate(
                definition.Key, definition.Name, definition.DefaultSubject, definition.DefaultHtmlBody));
        }
        else
        {
            template.Update(definition.DefaultSubject, definition.DefaultHtmlBody, null, true, currentUser.StaffId);
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
