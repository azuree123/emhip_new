namespace Emhip.Api.Auth;

/// <summary>Seam for sending transactional email (password reset links, invites). No real provider is wired up yet — see LoggingEmailSender.</summary>
public interface IEmailSender
{
    Task SendAsync(string toEmail, string subject, string body, CancellationToken cancellationToken = default);
}

/// <summary>
/// Dev-mode IEmailSender: just logs the message instead of sending it. There is no real email
/// provider configured — before deploying anywhere real, replace this registration in
/// Program.cs with a real sender (SendGrid, SES, SMTP, etc.); nothing else depends on how email
/// actually gets delivered.
/// </summary>
public sealed class LoggingEmailSender(ILogger<LoggingEmailSender> logger) : IEmailSender
{
    public Task SendAsync(string toEmail, string subject, string body, CancellationToken cancellationToken = default)
    {
        logger.LogWarning(
            "No email provider configured — logging instead of sending. To: {ToEmail}, Subject: {Subject}\n{Body}",
            toEmail, subject, body);
        return Task.CompletedTask;
    }
}
