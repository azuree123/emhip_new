namespace Emhip.Application.Settings;

public enum SettingKind { Text, Number, Boolean, Select, Secret, MultilineText }

/// <summary>
/// One configurable setting. <paramref name="VisibleWhen"/> lets the Settings UI show a field
/// only for the relevant storage provider (e.g. bucket fields when S3 is selected).
/// </summary>
public sealed record SettingDefinition(
    string Key,
    string Section,
    string Label,
    string? Description,
    SettingKind Kind,
    string? Default,
    IReadOnlyList<SettingOption>? Options = null,
    string? VisibleWhenKey = null,
    IReadOnlyList<string>? VisibleWhenValues = null);

public sealed record SettingOption(string Value, string Label);

/// <summary>
/// The authoritative list of settings the portal exposes. Every entry here is actually read
/// somewhere in the system — the Settings page renders itself from this catalog, so adding a
/// wired-up setting is a one-line change plus its consumer.
/// </summary>
public static class SettingsCatalog
{
    public static class Keys
    {
        public const string OrganisationName = "general.organisationName";
        public const string SupportEmail = "general.supportEmail";
        public const string DateFormat = "general.dateFormat";

        public const string StorageProvider = "documents.storage.provider";
        public const string LocalRoot = "documents.storage.local.root";
        public const string S3Bucket = "documents.storage.s3.bucket";
        public const string S3Region = "documents.storage.s3.region";
        public const string S3AccessKey = "documents.storage.s3.accessKey";
        public const string S3SecretKey = "documents.storage.s3.secretKey";
        public const string S3ServiceUrl = "documents.storage.s3.serviceUrl";
        public const string S3ForcePathStyle = "documents.storage.s3.forcePathStyle";
        public const string AzureConnectionString = "documents.storage.azure.connectionString";
        public const string AzureContainer = "documents.storage.azure.container";
        public const string GcpBucket = "documents.storage.gcp.bucket";
        public const string GcpCredentialsJson = "documents.storage.gcp.credentialsJson";

        public const string MaxUploadMb = "documents.upload.maxFileSizeMb";
        public const string AllowedExtensions = "documents.upload.allowedExtensions";
        public const string DefaultRetentionYears = "documents.retentionYears";

        public const string UrgentResponseHours = "clinical.urgentResponseHours";
        public const string InactivityDays = "clinical.inactivityDays";
        public const string FollowUpDefaultDays = "clinical.followUpDefaultDays";
        public const string DialogReviewWeeks = "clinical.dialogReviewWeeks";

        public const string GuestListPageSize = "ui.guestListPageSize";
    }

    private const string StorageSection = "Document storage";

    private static readonly IReadOnlyList<SettingOption> ProviderOptions =
    [
        new("Local", "Local disk (server volume)"),
        new("AwsS3", "Amazon S3"),
        new("S3Compatible", "S3-compatible (Contabo, MinIO, Spaces…)"),
        new("AzureBlob", "Azure Blob Storage"),
        new("GoogleCloudStorage", "Google Cloud Storage"),
    ];

    private static readonly string[] S3Providers = ["AwsS3", "S3Compatible"];

    public static readonly IReadOnlyList<SettingDefinition> All =
    [
        new(Keys.OrganisationName, "General", "Organisation name", "Shown in the portal header and on exported files.", SettingKind.Text, "EMHIP"),
        new(Keys.SupportEmail, "General", "Support email", "Displayed to staff who need help signing in.", SettingKind.Text, null),
        new(Keys.DateFormat, "General", "Date format", "How dates are rendered across the portal.", SettingKind.Select, "dd MMM yyyy",
            [new("dd MMM yyyy", "31 Dec 2026"), new("dd/MM/yyyy", "31/12/2026"), new("yyyy-MM-dd", "2026-12-31")]),

        new(Keys.StorageProvider, StorageSection, "Storage provider", "Where newly uploaded documents are written. Existing files stay readable on their original provider.", SettingKind.Select, "Local", ProviderOptions),
        new(Keys.LocalRoot, StorageSection, "Local storage path", "Absolute path inside the API container (bind-mounted to the host).", SettingKind.Text, "/var/emhip/documents",
            VisibleWhenKey: Keys.StorageProvider, VisibleWhenValues: ["Local"]),
        new(Keys.S3Bucket, StorageSection, "Bucket", null, SettingKind.Text, null, VisibleWhenKey: Keys.StorageProvider, VisibleWhenValues: S3Providers),
        new(Keys.S3Region, StorageSection, "Region", "e.g. eu-west-2. For Contabo use the region shown in your object storage panel.", SettingKind.Text, "eu-west-2",
            VisibleWhenKey: Keys.StorageProvider, VisibleWhenValues: S3Providers),
        new(Keys.S3AccessKey, StorageSection, "Access key", null, SettingKind.Secret, null, VisibleWhenKey: Keys.StorageProvider, VisibleWhenValues: S3Providers),
        new(Keys.S3SecretKey, StorageSection, "Secret key", null, SettingKind.Secret, null, VisibleWhenKey: Keys.StorageProvider, VisibleWhenValues: S3Providers),
        new(Keys.S3ServiceUrl, StorageSection, "Service URL", "Endpoint for non-AWS providers, e.g. https://eu2.contabostorage.com. Leave blank for Amazon S3.", SettingKind.Text, null,
            VisibleWhenKey: Keys.StorageProvider, VisibleWhenValues: ["S3Compatible"]),
        new(Keys.S3ForcePathStyle, StorageSection, "Force path-style URLs", "Required by most S3-compatible providers, including Contabo.", SettingKind.Boolean, "true",
            VisibleWhenKey: Keys.StorageProvider, VisibleWhenValues: ["S3Compatible"]),
        new(Keys.AzureConnectionString, StorageSection, "Connection string", null, SettingKind.Secret, null,
            VisibleWhenKey: Keys.StorageProvider, VisibleWhenValues: ["AzureBlob"]),
        new(Keys.AzureContainer, StorageSection, "Container", null, SettingKind.Text, "emhip-documents",
            VisibleWhenKey: Keys.StorageProvider, VisibleWhenValues: ["AzureBlob"]),
        new(Keys.GcpBucket, StorageSection, "Bucket", null, SettingKind.Text, null,
            VisibleWhenKey: Keys.StorageProvider, VisibleWhenValues: ["GoogleCloudStorage"]),
        new(Keys.GcpCredentialsJson, StorageSection, "Service account JSON", "Paste the full service-account key file contents.", SettingKind.Secret, null,
            VisibleWhenKey: Keys.StorageProvider, VisibleWhenValues: ["GoogleCloudStorage"]),

        new(Keys.MaxUploadMb, "Uploads", "Maximum file size (MB)", "Uploads larger than this are rejected.", SettingKind.Number, "25"),
        new(Keys.AllowedExtensions, "Uploads", "Allowed file types", "Comma-separated extensions. Leave blank to allow any type.", SettingKind.Text,
            "pdf,doc,docx,xls,xlsx,png,jpg,jpeg,txt,csv,rtf,odt"),
        new(Keys.DefaultRetentionYears, "Uploads", "Default retention (years)", "Pre-fills the retention date on new documents; 0 means no default.", SettingKind.Number, "7"),

        new(Keys.UrgentResponseHours, "Clinical", "Urgent response window (hours)", "Drives the countdown on urgent cases.", SettingKind.Number, "72"),
        new(Keys.InactivityDays, "Clinical", "Inactivity threshold (days)", "Guests with no contact in this period are flagged in Data Quality.", SettingKind.Number, "90"),
        new(Keys.FollowUpDefaultDays, "Clinical", "Default follow-up interval (days)", "Pre-fills the due date when scheduling a follow-up.", SettingKind.Number, "14"),
        new(Keys.DialogReviewWeeks, "Clinical", "DIALOG review interval (weeks)", "Used to suggest when the next DIALOG assessment is due.", SettingKind.Number, "12"),

        new(Keys.GuestListPageSize, "Interface", "Guest list page size", "Rows fetched per page in the guest list.", SettingKind.Number, "50"),
    ];

    private static readonly Dictionary<string, SettingDefinition> ByKey = All.ToDictionary(d => d.Key, StringComparer.OrdinalIgnoreCase);

    public static bool TryGet(string key, out SettingDefinition definition) => ByKey.TryGetValue(key, out definition!);

    public static bool IsSecret(string key) => ByKey.TryGetValue(key, out var d) && d.Kind == SettingKind.Secret;

    public static string? DefaultFor(string key) => ByKey.TryGetValue(key, out var d) ? d.Default : null;

    /// <summary>Non-secret settings the SPA is allowed to read for display/behaviour (GET /settings/public).</summary>
    public static readonly IReadOnlyList<string> PublicKeys =
    [
        Keys.OrganisationName, Keys.SupportEmail, Keys.DateFormat,
        Keys.MaxUploadMb, Keys.AllowedExtensions, Keys.DefaultRetentionYears,
        Keys.UrgentResponseHours, Keys.InactivityDays, Keys.FollowUpDefaultDays, Keys.DialogReviewWeeks,
        Keys.GuestListPageSize,
    ];
}
