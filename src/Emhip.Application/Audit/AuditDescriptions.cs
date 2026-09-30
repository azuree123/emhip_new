using Emhip.Domain.Enums;

namespace Emhip.Application.Audit;

/// <summary>
/// Plain-English wording for audit events ("Opened guest record", "Viewed urgent case") shown in
/// the Hub Manager's staff activity feed and a guest's Access Log. The stored event keeps its
/// technical action + entity name; only the wording shown to staff is derived here.
/// </summary>
public static class AuditDescriptions
{
    /// <summary>What each audited entity is called on screen.</summary>
    private static readonly Dictionary<string, string> Nouns = new(StringComparer.Ordinal)
    {
        ["Guest"] = "guest record",
        ["GuestDemographics"] = "demographics",
        ["InitialConversationRecord"] = "initial conversation",
        ["Contact"] = "contact",
        ["Note"] = "note",
        ["RiskAssessment"] = "risk assessment",
        ["FollowUp"] = "scheduled contact",
        ["PathwayReferral"] = "pathway referral",
        ["DialogAssessment"] = "DIALOG scores",
        ["GuestAction"] = "action",
        ["GuestClinicalProfile"] = "clinical details",
        ["UrgentEpisode"] = "urgent case",
        ["Document"] = "document",
        ["DocumentVersion"] = "document version",
        ["CaseworkNote"] = "casework note",
        ["PathwayChange"] = "pathway",
        ["CaseloadAssignment"] = "CMHW assignment",
        ["CarePlan"] = "care plan",
        ["CarePlanGoal"] = "care plan goal",
        ["CpnInitialAssessment"] = "CPN initial assessment",
        ["CpnRiskDomainRating"] = "CPN risk rating",
        ["CustomFieldValue"] = "additional details",
        ["AppSetting"] = "setting",
        ["LookupItem"] = "list option",
        ["EmailTemplate"] = "email template",
        ["CustomFieldDefinition"] = "custom field",
    };

    /// <summary>Creations that read better as their own verb than "Added …".</summary>
    private static readonly Dictionary<string, string> Created = new(StringComparer.Ordinal)
    {
        ["Guest"] = "Registered guest",
        ["Contact"] = "Recorded a contact",
        ["RiskAssessment"] = "Recorded a risk assessment",
        ["FollowUp"] = "Scheduled a contact",
        ["PathwayReferral"] = "Made a pathway referral",
        ["DialogAssessment"] = "Recorded DIALOG scores",
        ["UrgentEpisode"] = "Opened an urgent case",
        ["Document"] = "Uploaded a document",
        ["DocumentVersion"] = "Uploaded a new document version",
        ["CaseworkNote"] = "Started a casework note",
        ["PathwayChange"] = "Changed pathway",
        ["CaseloadAssignment"] = "Assigned a CMHW",
        ["CarePlan"] = "Created a care plan",
        ["InitialConversationRecord"] = "Recorded the initial conversation",
        ["GuestDemographics"] = "Recorded demographics",
        ["GuestClinicalProfile"] = "Recorded clinical details",
        ["CpnInitialAssessment"] = "Started a CPN initial assessment",
    };

    public static string Describe(string action, string entityName, string? details)
    {
        // Explicit IAuditTrail writes carry their own meaning in Details.
        if (details is not null)
        {
            if (details.StartsWith("Subject access export", StringComparison.Ordinal)) return "Exported the full guest record";
            if (details.StartsWith("Record anonymised", StringComparison.Ordinal)) return "Anonymised guest record";
            if (details.StartsWith("Downloaded", StringComparison.Ordinal)) return "Downloaded a document";
            if (details.StartsWith("Urgent episode record exported", StringComparison.Ordinal)) return "Exported urgent case record";
        }

        var noun = Nouns.GetValueOrDefault(entityName) ?? Humanise(entityName);
        return action switch
        {
            nameof(AuditAction.Read) when entityName == "Guest" => "Opened guest record",
            nameof(AuditAction.Read) => $"Viewed {noun}",
            nameof(AuditAction.Create) => Created.GetValueOrDefault(entityName) ?? $"Added {noun}",
            nameof(AuditAction.Update) when entityName == "CaseworkNote" && details?.Contains("SubmittedAt", StringComparison.Ordinal) == true
                => "Submitted a casework note",
            nameof(AuditAction.Update) when entityName == "UrgentEpisode" && details?.Contains("ResolvedAt", StringComparison.Ordinal) == true
                => "Resolved an urgent case",
            nameof(AuditAction.Update) => $"Updated {noun}",
            nameof(AuditAction.Delete) => $"Removed {noun}",
            _ => $"{action} {noun}",
        };
    }

    public static string Describe(AuditAction action, string entityName, string? details) =>
        Describe(action.ToString(), entityName, details);

    /// <summary>"CarePlanGoal" → "care plan goal" for any entity not in the table above.</summary>
    private static string Humanise(string entityName) =>
        string.Concat(entityName.Select((c, i) => i > 0 && char.IsUpper(c) ? " " + char.ToLowerInvariant(c) : char.ToLowerInvariant(c).ToString()));
}
