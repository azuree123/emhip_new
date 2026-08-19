using Emhip.Application.Abstractions;
using Emhip.Application.Settings;
using MediatR;

namespace Emhip.Application.Emails;

public sealed record EmailPreviewDto(string Subject, string HtmlBody, string TextBody);

/// <summary>Renders a template with sample data so admins can see it before saving.</summary>
public sealed record PreviewEmailTemplateQuery(string Key, string? Subject, string? HtmlBody) : IRequest<EmailPreviewDto>;

public sealed class PreviewEmailTemplateQueryHandler(IAppSettingsService settings, IAppDbContext db)
    : IRequestHandler<PreviewEmailTemplateQuery, EmailPreviewDto>
{
    public async Task<EmailPreviewDto> Handle(PreviewEmailTemplateQuery request, CancellationToken cancellationToken)
    {
        var definition = EmailTemplateCatalog.Find(request.Key)
            ?? throw new KeyNotFoundException($"Unknown email template '{request.Key}'.");

        // Unsaved editor content wins, so the preview reflects what you're typing.
        var stored = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .FirstOrDefaultAsync(db.EmailTemplates, t => t.Key == request.Key, cancellationToken);

        var subject = request.Subject ?? stored?.Subject ?? definition.DefaultSubject;
        var html = request.HtmlBody ?? stored?.HtmlBody ?? definition.DefaultHtmlBody;

        var organisation = await settings.GetAsync(SettingsCatalog.Keys.OrganisationName, cancellationToken) ?? "EMHIP";
        var tokens = TemplateRenderer.SampleTokens(definition, organisation, portalUrl: null);

        var renderedHtml = TemplateRenderer.Render(html, tokens);
        return new EmailPreviewDto(
            TemplateRenderer.Render(subject, tokens),
            renderedHtml,
            TemplateRenderer.StripHtml(renderedHtml));
    }
}

public sealed record EmailTestResultDto(bool Success, string Message);

/// <summary>
/// "Send test email" on the Settings page. Uses the supplied (possibly unsaved) provider values,
/// falling back to stored ones for anything blank — so secrets never need re-entering.
/// </summary>
public sealed record SendTestEmailCommand(string ToEmail, string Provider, IReadOnlyDictionary<string, string?> Values) : IRequest<EmailTestResultDto>;

public sealed class SendTestEmailCommandHandler(
    IEmailProviderFactory providerFactory, IAppSettingsService settings, IEmailService emailService)
    : IRequestHandler<SendTestEmailCommand, EmailTestResultDto>
{
    public async Task<EmailTestResultDto> Handle(SendTestEmailCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ToEmail))
        {
            return new EmailTestResultDto(false, "Enter an address to send the test to.");
        }

        try
        {
            var provider = await providerFactory.BuildAsync(request.Provider, request.Values, cancellationToken);
            if (provider is null)
            {
                return new EmailTestResultDto(false, "Choose an email provider before sending a test.");
            }

            string? Value(string key) =>
                request.Values.TryGetValue(key, out var supplied) && !string.IsNullOrWhiteSpace(supplied) ? supplied : null;

            var fromAddress = Value(SettingsCatalog.Keys.EmailFromAddress)
                ?? await settings.GetAsync(SettingsCatalog.Keys.EmailFromAddress, cancellationToken);
            if (string.IsNullOrWhiteSpace(fromAddress))
            {
                return new EmailTestResultDto(false, "Set a from-address before sending a test.");
            }

            var fromName = Value(SettingsCatalog.Keys.EmailFromName)
                ?? await settings.GetAsync(SettingsCatalog.Keys.EmailFromName, cancellationToken) ?? "EMHIP Portal";
            var replyTo = Value(SettingsCatalog.Keys.EmailReplyTo)
                ?? await settings.GetAsync(SettingsCatalog.Keys.EmailReplyTo, cancellationToken);

            var organisation = await settings.GetAsync(SettingsCatalog.Keys.OrganisationName, cancellationToken) ?? "EMHIP";
            var definition = EmailTemplateCatalog.Find(EmailTemplateCatalog.Keys.TestEmail)!;
            var tokens = new Dictionary<string, string?>(TemplateRenderer.SampleTokens(definition, organisation, null))
            {
                ["providerName"] = provider.Provider,
                ["recipientName"] = request.ToEmail,
            };

            var html = TemplateRenderer.Render(definition.DefaultHtmlBody, tokens);
            await provider.SendAsync(
                new EmailMessage(request.ToEmail, TemplateRenderer.Render(definition.DefaultSubject, tokens), html, TemplateRenderer.StripHtml(html)),
                fromAddress, fromName, replyTo, cancellationToken);

            return new EmailTestResultDto(true, $"Test email sent to {request.ToEmail} via {provider.Provider}.");
        }
        catch (Exception ex)
        {
            return new EmailTestResultDto(false, ex.Message);
        }
    }
}
