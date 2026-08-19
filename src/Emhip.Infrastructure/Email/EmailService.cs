using Emhip.Application.Abstractions;
using Emhip.Application.Emails;
using Emhip.Application.Settings;
using Emhip.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http;

namespace Emhip.Infrastructure.Email;

/// <summary>Builds the configured provider from settings; returns null when email is switched off.</summary>
public sealed class EmailProviderFactory(IAppSettingsService settings, IHttpClientFactory httpClientFactory) : IEmailProviderFactory
{
    public async Task<IEmailSenderProvider?> GetActiveAsync(CancellationToken cancellationToken = default)
    {
        var provider = await settings.GetAsync(SettingsCatalog.Keys.EmailProvider, cancellationToken) ?? "None";
        return await BuildAsync(provider, new Dictionary<string, string?>(), cancellationToken);
    }

    public async Task<IEmailSenderProvider?> BuildAsync(
        string provider, IReadOnlyDictionary<string, string?> overrides, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(provider) || provider.Equals("None", StringComparison.OrdinalIgnoreCase)) return null;

        var stored = await settings.GetAllAsync(cancellationToken);

        // Blank overrides fall back to saved values, so "send test" works without re-entering secrets.
        string? Value(string key) =>
            overrides.TryGetValue(key, out var supplied) && !string.IsNullOrWhiteSpace(supplied)
                ? supplied
                : stored.TryGetValue(key, out var saved) && !string.IsNullOrEmpty(saved)
                    ? saved
                    : SettingsCatalog.DefaultFor(key);

        return provider.ToLowerInvariant() switch
        {
            "smtp" => new SmtpEmailSenderProvider(
                Require(Value(SettingsCatalog.Keys.SmtpHost), "SMTP host"),
                int.TryParse(Value(SettingsCatalog.Keys.SmtpPort), out var port) ? port : 587,
                Value(SettingsCatalog.Keys.SmtpUsername),
                Value(SettingsCatalog.Keys.SmtpPassword),
                Value(SettingsCatalog.Keys.SmtpSecurity) ?? "StartTls"),

            "awsses" => new SesEmailSenderProvider(
                Value(SettingsCatalog.Keys.SesRegion) ?? "eu-west-2",
                Require(Value(SettingsCatalog.Keys.SesAccessKey), "SES access key"),
                Require(Value(SettingsCatalog.Keys.SesSecretKey), "SES secret key")),

            "mailgun" => new MailgunEmailSenderProvider(
                httpClientFactory.CreateClient("mailgun"),
                Require(Value(SettingsCatalog.Keys.MailgunDomain), "Mailgun domain"),
                Require(Value(SettingsCatalog.Keys.MailgunApiKey), "Mailgun API key"),
                Value(SettingsCatalog.Keys.MailgunRegion) ?? "US"),

            _ => throw new InvalidOperationException($"Unknown email provider '{provider}'."),
        };
    }

    private static string Require(string? value, string what) =>
        string.IsNullOrWhiteSpace(value)
            ? throw new InvalidOperationException($"Email is missing its {what} — set it on the Settings page.")
            : value;
}

/// <summary>
/// Renders stored templates and hands them to the active provider. Failures are logged and
/// returned, never thrown: an email that can't be delivered must not fail the clinical action
/// that triggered it.
/// </summary>
public sealed class EmailService(
    EmhipDbContext db,
    IAppSettingsService settings,
    IEmailProviderFactory providerFactory,
    IConfiguration configuration,
    ILogger<EmailService> logger) : IEmailService
{
    public async Task<EmailSendResult> SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        try
        {
            var provider = await providerFactory.GetActiveAsync(cancellationToken);
            if (provider is null)
            {
                logger.LogInformation(
                    "Email not configured — skipping message to {To} with subject {Subject}", message.ToEmail, message.Subject);
                return EmailSendResult.Skipped;
            }

            var fromAddress = await settings.GetAsync(SettingsCatalog.Keys.EmailFromAddress, cancellationToken);
            if (string.IsNullOrWhiteSpace(fromAddress))
            {
                return new EmailSendResult(false, "No from-address is configured.");
            }

            var fromName = await settings.GetAsync(SettingsCatalog.Keys.EmailFromName, cancellationToken) ?? "EMHIP Portal";
            var replyTo = await settings.GetAsync(SettingsCatalog.Keys.EmailReplyTo, cancellationToken);

            await provider.SendAsync(message, fromAddress, fromName, replyTo, cancellationToken);
            return new EmailSendResult(true);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send email to {To}", message.ToEmail);
            return new EmailSendResult(false, ex.Message);
        }
    }

    public async Task<EmailSendResult> SendTemplateAsync(
        string templateKey, string toEmail, IReadOnlyDictionary<string, string?> tokens,
        string? toName = null, CancellationToken cancellationToken = default)
    {
        var template = await db.EmailTemplates.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Key == templateKey, cancellationToken);

        if (template is null)
        {
            logger.LogWarning("Email template '{Key}' is missing — nothing sent", templateKey);
            return new EmailSendResult(false, $"Template '{templateKey}' not found.");
        }

        if (!template.IsEnabled)
        {
            logger.LogInformation("Email template '{Key}' is disabled — nothing sent", templateKey);
            return new EmailSendResult(false, "Template is disabled.");
        }

        var merged = await WithCommonTokensAsync(tokens, cancellationToken);
        var html = TemplateRenderer.Render(template.HtmlBody, merged);
        var message = new EmailMessage(
            toEmail,
            TemplateRenderer.Render(template.Subject, merged),
            html,
            string.IsNullOrWhiteSpace(template.TextBody) ? TemplateRenderer.StripHtml(html) : TemplateRenderer.Render(template.TextBody, merged),
            toName);

        return await SendAsync(message, cancellationToken);
    }

    /// <summary>Adds organisation/portal tokens every template can use.</summary>
    public async Task<IReadOnlyDictionary<string, string?>> WithCommonTokensAsync(
        IReadOnlyDictionary<string, string?> tokens, CancellationToken cancellationToken)
    {
        var merged = new Dictionary<string, string?>(tokens, StringComparer.OrdinalIgnoreCase)
        {
            ["organisationName"] = await settings.GetAsync(SettingsCatalog.Keys.OrganisationName, cancellationToken) ?? "EMHIP",
            ["supportEmail"] = await settings.GetAsync(SettingsCatalog.Keys.SupportEmail, cancellationToken) ?? string.Empty,
            ["portalUrl"] = configuration["Frontend:BaseUrl"] ?? string.Empty,
            ["year"] = DateTime.UtcNow.Year.ToString(),
        };

        return merged;
    }
}
