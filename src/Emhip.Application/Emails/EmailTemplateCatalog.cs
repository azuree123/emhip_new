namespace Emhip.Application.Emails;

/// <summary>
/// The transactional emails the system can send. Each entry documents the tokens available to
/// its template, which the Settings editor shows as clickable chips. Adding an entry here seeds
/// a new editable template on the next startup; the trigger that sends it lives in code.
/// </summary>
public sealed record EmailTemplateDefinition(
    string Key,
    string Name,
    string Description,
    IReadOnlyList<string> Tokens,
    string DefaultSubject,
    string DefaultHtmlBody);

public static class EmailTemplateCatalog
{
    public static class Keys
    {
        public const string PasswordReset = "password-reset";
        public const string AccountCreated = "account-created";
        public const string UrgentCaseRaised = "urgent-case-raised";
        public const string FollowUpOverdue = "follow-up-overdue";
        public const string TestEmail = "test-email";
    }

    /// <summary>Tokens every template can use, filled in by the renderer.</summary>
    public static readonly IReadOnlyList<string> CommonTokens = ["organisationName", "supportEmail", "portalUrl", "year"];

    public static readonly IReadOnlyList<EmailTemplateDefinition> All =
    [
        new(Keys.PasswordReset,
            "Password reset",
            "Sent when a user requests a password reset from the sign-in page.",
            ["recipientName", "resetUrl"],
            "Reset your {{organisationName}} password",
            Layout("Reset your password", """
                <p>Hello {{recipientName}},</p>
                <p>We received a request to reset your {{organisationName}} portal password.
                   Click the button below to choose a new one. This link expires shortly and can only be used once.</p>
                <p style="text-align:center;margin:32px 0;">
                  <a href="{{resetUrl}}" style="background:#e12628;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block;font-weight:600;">Reset password</a>
                </p>
                <p style="color:#6b6b6b;font-size:13px;">If you did not request this, you can safely ignore this email — your password will not change.</p>
                """)),

        new(Keys.AccountCreated,
            "Account created",
            "Sent to a new staff member when an administrator creates their account.",
            ["recipientName", "email", "temporaryPassword", "portalUrl"],
            "Your {{organisationName}} account is ready",
            Layout("Welcome to {{organisationName}}", """
                <p>Hello {{recipientName}},</p>
                <p>An account has been created for you on the {{organisationName}} portal.</p>
                <table style="border-collapse:collapse;margin:20px 0;">
                  <tr><td style="padding:6px 16px 6px 0;color:#6b6b6b;">Sign-in address</td><td style="padding:6px 0;font-weight:600;">{{email}}</td></tr>
                  <tr><td style="padding:6px 16px 6px 0;color:#6b6b6b;">Temporary password</td><td style="padding:6px 0;font-weight:600;">{{temporaryPassword}}</td></tr>
                </table>
                <p>Please sign in and change your password straight away.</p>
                <p style="text-align:center;margin:32px 0;">
                  <a href="{{portalUrl}}" style="background:#e12628;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block;font-weight:600;">Open the portal</a>
                </p>
                """)),

        new(Keys.UrgentCaseRaised,
            "Urgent case raised",
            "Sent to the assigned worker when a guest is escalated by a risk flag.",
            ["recipientName", "guestName", "guestReference", "riskFlags", "raisedAt", "guestUrl", "responseHours"],
            "URGENT: {{guestName}} ({{guestReference}}) has been flagged",
            Layout("Urgent case raised", """
                <p style="background:#fff0f1;border-left:4px solid #e12628;padding:12px 16px;margin:0 0 20px;">
                  <strong>{{guestName}}</strong> ({{guestReference}}) was flagged as urgent on {{raisedAt}}.
                </p>
                <p>Hello {{recipientName}},</p>
                <p>A risk assessment has escalated this guest onto the urgent cases queue.</p>
                <p><strong>Risk flags:</strong> {{riskFlags}}</p>
                <p>The response window for urgent cases is <strong>{{responseHours}} hours</strong>.</p>
                <p style="text-align:center;margin:32px 0;">
                  <a href="{{guestUrl}}" style="background:#e12628;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block;font-weight:600;">Open guest record</a>
                </p>
                <p style="color:#6b6b6b;font-size:13px;">This message contains clinical information — please handle it in line with your information governance policy.</p>
                """)),

        new(Keys.FollowUpOverdue,
            "Follow-up overdue",
            "Sent to a worker when their scheduled follow-ups pass their due date.",
            ["recipientName", "overdueCount", "followUpList", "portalUrl"],
            "You have {{overdueCount}} overdue follow-up(s)",
            Layout("Overdue follow-ups", """
                <p>Hello {{recipientName}},</p>
                <p>You have <strong>{{overdueCount}}</strong> follow-up(s) that have passed their due date:</p>
                {{followUpList}}
                <p style="text-align:center;margin:32px 0;">
                  <a href="{{portalUrl}}/followups" style="background:#e12628;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block;font-weight:600;">Review follow-ups</a>
                </p>
                """)),

        new(Keys.TestEmail,
            "Test email",
            "Sent by the \"Send test email\" button on the Settings page.",
            ["recipientName", "providerName"],
            "{{organisationName}} email test",
            Layout("Email delivery is working", """
                <p>This is a test message from the {{organisationName}} portal.</p>
                <p>It was delivered using the <strong>{{providerName}}</strong> provider, which means your email settings are correct.</p>
                """)),
    ];

    private static readonly Dictionary<string, EmailTemplateDefinition> ByKey =
        All.ToDictionary(t => t.Key, StringComparer.OrdinalIgnoreCase);

    public static EmailTemplateDefinition? Find(string key) => ByKey.GetValueOrDefault(key);

    /// <summary>
    /// Shared HTML shell so every default template looks consistent in a mail client. Built with
    /// marker replacement rather than string interpolation, because C#'s interpolation braces
    /// collide with the <c>{{token}}</c> placeholder syntax these templates are written in.
    /// </summary>
    private static string Layout(string heading, string content) =>
        LayoutShell.Replace("[[HEADING]]", heading).Replace("[[CONTENT]]", content);

    private const string LayoutShell = """
        <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f4f4f5;padding:24px;">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5;">
            <div style="padding:20px 28px;border-bottom:1px solid #ededed;">
              <span style="font-size:16px;font-weight:700;color:#1a1a1a;">{{organisationName}}</span>
            </div>
            <div style="padding:28px;color:#1a1a1a;font-size:15px;line-height:1.55;">
              <h1 style="margin:0 0 18px;font-size:19px;font-weight:700;">[[HEADING]]</h1>
              [[CONTENT]]
            </div>
            <div style="padding:16px 28px;background:#fafafa;border-top:1px solid #ededed;color:#6b6b6b;font-size:12px;">
              Sent by the {{organisationName}} portal · Questions? {{supportEmail}}
            </div>
          </div>
        </div>
        """;
}
