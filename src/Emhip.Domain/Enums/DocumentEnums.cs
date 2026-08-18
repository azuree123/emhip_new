namespace Emhip.Domain.Enums;

/// <summary>Lifecycle state of a controlled document (independent of soft deletion).</summary>
public enum DocumentStatus
{
    Draft = 0,
    Active = 1,
    Archived = 2,
}

/// <summary>
/// Where a document's bytes live. Contabo, MinIO, DigitalOcean Spaces and any other
/// S3-compatible object store use <see cref="S3Compatible"/> with a custom service URL.
/// </summary>
public enum DocumentStorageProvider
{
    Local = 0,
    AwsS3 = 1,
    S3Compatible = 2,
    AzureBlob = 3,
    GoogleCloudStorage = 4,
}
