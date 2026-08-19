namespace Emhip.Application.Abstractions;

public sealed record EmailMessage(string ToEmail, string Subject, string HtmlBody, string? TextBody = null, string? ToName = null);

public sealed record EmailSendResult(bool Sent, string? Error = null)
{
    public static readonly EmailSendResult Skipped = new(false, "Email delivery is not configured.");
}

/// <summary>
/// Sends transactional email through whichever provider is configured on the Settings page.
/// Sending never throws into the caller's workflow: a failed notification must not roll back the
/// clinical action that triggered it, so failures come back as <see cref="EmailSendResult"/>.
/// </summary>
public interface IEmailService
{
    Task<EmailSendResult> SendAsync(EmailMessage message, CancellationToken cancellationToken = default);

    /// <summary>
    /// Renders the stored template for <paramref name="templateKey"/> with the given tokens and
    /// sends it. Disabled or missing templates are skipped without error.
    /// </summary>
    Task<EmailSendResult> SendTemplateAsync(
        string templateKey, string toEmail, IReadOnlyDictionary<string, string?> tokens,
        string? toName = null, CancellationToken cancellationToken = default);
}

/// <summary>One configured delivery backend (SMTP, SES, Mailgun).</summary>
public interface IEmailSenderProvider
{
    string Provider { get; }
    Task SendAsync(EmailMessage message, string fromAddress, string fromName, string? replyTo, CancellationToken cancellationToken = default);
}

public interface IEmailProviderFactory
{
    /// <summary>Null when no provider is configured — callers then skip sending.</summary>
    Task<IEmailSenderProvider?> GetActiveAsync(CancellationToken cancellationToken = default);

    /// <summary>Builds a provider from unsaved settings values for the "send test email" button.</summary>
    Task<IEmailSenderProvider?> BuildAsync(string provider, IReadOnlyDictionary<string, string?> overrides, CancellationToken cancellationToken = default);
}
