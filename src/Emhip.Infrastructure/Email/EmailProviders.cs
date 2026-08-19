using System.Net.Http.Headers;
using Amazon;
using Amazon.Runtime;
using Amazon.SimpleEmailV2;
using Amazon.SimpleEmailV2.Model;
using Emhip.Application.Abstractions;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using MimeKit.Text;

namespace Emhip.Infrastructure.Email;

/// <summary>Any SMTP relay (Office 365, Google Workspace, a hospital relay, Mailtrap…).</summary>
public sealed class SmtpEmailSenderProvider(string host, int port, string? username, string? password, string security)
    : IEmailSenderProvider
{
    public string Provider => "Smtp";

    public async Task SendAsync(EmailMessage message, string fromAddress, string fromName, string? replyTo, CancellationToken cancellationToken = default)
    {
        var mail = new MimeMessage();
        mail.From.Add(new MailboxAddress(fromName, fromAddress));
        mail.To.Add(new MailboxAddress(message.ToName ?? message.ToEmail, message.ToEmail));
        if (!string.IsNullOrWhiteSpace(replyTo)) mail.ReplyTo.Add(MailboxAddress.Parse(replyTo));
        mail.Subject = message.Subject;

        var builder = new BodyBuilder { HtmlBody = message.HtmlBody };
        if (!string.IsNullOrWhiteSpace(message.TextBody)) builder.TextBody = message.TextBody;
        mail.Body = builder.ToMessageBody();

        var socketOptions = security switch
        {
            "SslOnConnect" => SecureSocketOptions.SslOnConnect,
            "None" => SecureSocketOptions.None,
            _ => SecureSocketOptions.StartTls,
        };

        using var client = new SmtpClient();
        await client.ConnectAsync(host, port, socketOptions, cancellationToken);

        if (!string.IsNullOrWhiteSpace(username))
        {
            await client.AuthenticateAsync(username, password ?? string.Empty, cancellationToken);
        }

        await client.SendAsync(mail, cancellationToken);
        await client.DisconnectAsync(quit: true, cancellationToken);
    }
}

/// <summary>Amazon SES v2. The from-address must be a verified identity in the configured region.</summary>
public sealed class SesEmailSenderProvider(string region, string accessKey, string secretKey) : IEmailSenderProvider, IDisposable
{
    private readonly AmazonSimpleEmailServiceV2Client _client = new(
        new BasicAWSCredentials(accessKey, secretKey), RegionEndpoint.GetBySystemName(region));

    public string Provider => "AwsSes";

    public async Task SendAsync(EmailMessage message, string fromAddress, string fromName, string? replyTo, CancellationToken cancellationToken = default)
    {
        var request = new SendEmailRequest
        {
            FromEmailAddress = string.IsNullOrWhiteSpace(fromName) ? fromAddress : $"{fromName} <{fromAddress}>",
            Destination = new Destination { ToAddresses = [message.ToEmail] },
            Content = new EmailContent
            {
                Simple = new Message
                {
                    Subject = new Content { Data = message.Subject, Charset = "UTF-8" },
                    Body = new Body
                    {
                        Html = new Content { Data = message.HtmlBody, Charset = "UTF-8" },
                        Text = string.IsNullOrWhiteSpace(message.TextBody)
                            ? null
                            : new Content { Data = message.TextBody, Charset = "UTF-8" },
                    },
                },
            },
        };

        if (!string.IsNullOrWhiteSpace(replyTo)) request.ReplyToAddresses = [replyTo];

        await _client.SendEmailAsync(request, cancellationToken);
    }

    public void Dispose() => _client.Dispose();
}

/// <summary>Mailgun's HTTP API — no SDK needed, just basic auth against the region's base URL.</summary>
public sealed class MailgunEmailSenderProvider(HttpClient httpClient, string domain, string apiKey, string region) : IEmailSenderProvider
{
    public string Provider => "Mailgun";

    public async Task SendAsync(EmailMessage message, string fromAddress, string fromName, string? replyTo, CancellationToken cancellationToken = default)
    {
        var baseUrl = string.Equals(region, "EU", StringComparison.OrdinalIgnoreCase)
            ? "https://api.eu.mailgun.net"
            : "https://api.mailgun.net";

        var form = new List<KeyValuePair<string, string>>
        {
            new("from", string.IsNullOrWhiteSpace(fromName) ? fromAddress : $"{fromName} <{fromAddress}>"),
            new("to", message.ToEmail),
            new("subject", message.Subject),
            new("html", message.HtmlBody),
        };

        if (!string.IsNullOrWhiteSpace(message.TextBody)) form.Add(new("text", message.TextBody));
        if (!string.IsNullOrWhiteSpace(replyTo)) form.Add(new("h:Reply-To", replyTo));

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/v3/{domain}/messages")
        {
            Content = new FormUrlEncodedContent(form),
        };

        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Basic", Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"api:{apiKey}")));

        var response = await httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Mailgun rejected the message ({(int)response.StatusCode}): {body}");
        }
    }
}
