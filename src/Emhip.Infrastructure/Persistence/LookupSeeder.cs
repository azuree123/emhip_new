using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Infrastructure.Persistence;

/// <summary>
/// Seeds the built-in dropdown options on startup. Items are added only when their
/// (category, code) is missing, so relabelled or deactivated options are never overwritten and
/// new releases can introduce additional options safely.
/// </summary>
public static class LookupSeeder
{
    public static class Categories
    {
        public const string DocumentCategory = "DocumentCategory";
        public const string ReferralSource = "ReferralSource";
        public const string Ethnicity = "Ethnicity";
        public const string HousingStatus = "HousingStatus";
        public const string EmploymentStatus = "EmploymentStatus";
        public const string PreferredLanguage = "PreferredLanguage";
        public const string DiagnosisGroup = "DiagnosisGroup";
        public const string CmhtTeam = "CmhtTeam";
        public const string EscalationReason = "EscalationReason";
        public const string EscalationUrgency = "EscalationUrgency";
        public const string FollowUpCadence = "FollowUpCadence";
        public const string ContactRelationship = "ContactRelationship";
        public const string MaritalStatus = "MaritalStatus";
        public const string LivingGroup = "LivingGroup";
        public const string SecondaryReferralSubcategory = "SecondaryReferralSubcategory";
        public const string Gender = "Gender";
        public const string CountryOfOrigin = "CountryOfOrigin";
    }

    private static readonly (string Category, string[] Labels)[] Seed =
    [
        (Categories.DocumentCategory, [
            "Consent form", "Assessment", "Care plan", "Correspondence", "Risk assessment",
            "Discharge summary", "Identification", "Referral letter", "Report", "Other",
        ]),
        (Categories.ReferralSource, [
            "GP referral", "CMHT", "Community organisation", "Self-referral", "Family / carer", "Hospital discharge",
        ]),
        (Categories.Ethnicity, [
            "White British", "White Irish", "White other", "Black African", "Black Caribbean", "Black other",
            "Indian", "Pakistani", "Bangladeshi", "Chinese", "Mixed heritage", "Arab", "Other ethnic group",
            "Prefer not to say",
        ]),
        (Categories.HousingStatus, [
            "Own home", "Private rented", "Social housing", "Supported accommodation",
            "Temporary accommodation", "Living with family", "Homeless", "Other",
        ]),
        (Categories.EmploymentStatus, [
            "Employed full-time", "Employed part-time", "Self-employed", "Unemployed",
            "Student", "Retired", "Unable to work", "Volunteering", "Other",
        ]),
        (Categories.PreferredLanguage, [
            "English", "Arabic", "Bengali", "French", "Gujarati", "Polish", "Portuguese",
            "Punjabi", "Somali", "Spanish", "Turkish", "Urdu", "Other",
        ]),
        (Categories.DiagnosisGroup, [
            "Depression", "Anxiety", "PTSD", "Bipolar affective disorder", "Psychosis",
            "Personality disorder", "Eating disorder", "Substance misuse", "Other", "None recorded",
        ]),
        (Categories.CmhtTeam, [
            "Lambeth Assessment & Liaison", "Southwark Crisis Team", "Lewisham Home Treatment Team",
            "Community Recovery Team", "Early Intervention Service",
        ]),
        (Categories.EscalationReason, [
            "Immediate risk to self", "Risk to others", "Rapid deterioration",
            "Safeguarding concern", "No response to outreach",
        ]),
        (Categories.EscalationUrgency, ["Emergency (same day)", "Urgent (24h)", "Routine (72h)"]),
        (Categories.FollowUpCadence, ["Weekly", "Fortnightly", "Monthly"]),
        (Categories.ContactRelationship, [
            "Parent", "Partner", "Sibling", "Child", "Friend", "Carer", "Support worker", "Other",
        ]),
        (Categories.MaritalStatus, [
            "Single", "Married", "Civil partnership", "Cohabiting", "Separated", "Divorced", "Widowed",
            "Prefer not to say",
        ]),
        (Categories.LivingGroup, [
            "Lives alone", "Lives with partner", "Lives with family", "Lives with friends",
            "Shared accommodation", "Supported living", "No fixed abode", "Other",
        ]),
        (Categories.Gender, ["Female", "Male", "Non-binary", "Prefer to self-describe", "Prefer not to say"]),
        (Categories.CountryOfOrigin, [
            "United Kingdom", "Ireland", "Nigeria", "Ghana", "Jamaica", "Somalia", "Eritrea", "Ethiopia",
            "India", "Pakistan", "Bangladesh", "Sri Lanka", "Poland", "Romania", "Portugal", "Italy",
            "Turkey", "Iran", "Iraq", "Afghanistan", "Syria", "Albania", "Brazil", "Colombia", "Other",
        ]),
        (Categories.SecondaryReferralSubcategory, [
            "Community mental health team", "Crisis team", "Inpatient discharge", "Talking therapies",
            "Substance misuse service", "Social services", "Housing service", "Voluntary sector partner",
            "Police / criminal justice", "Other statutory service",
        ]),
    ];

    public static async Task SeedAsync(EmhipDbContext db, CancellationToken cancellationToken = default)
    {
        var existing = await db.LookupItems.AsNoTracking()
            .Select(l => new { l.Category, l.Code })
            .ToListAsync(cancellationToken);

        var known = existing.Select(e => $"{e.Category}|{e.Code}").ToHashSet(StringComparer.OrdinalIgnoreCase);
        var added = false;

        foreach (var (category, labels) in Seed)
        {
            for (var index = 0; index < labels.Length; index++)
            {
                var label = labels[index];
                var code = ToCode(label);
                if (!known.Add($"{category}|{code}")) continue;

                db.LookupItems.Add(new LookupItem(category, code, label, index + 1, isSystem: true));
                added = true;
            }
        }

        if (added) await db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>"GP referral" -> "gp-referral". Stable across relabels because the code is stored.</summary>
    private static string ToCode(string label)
    {
        var chars = label.ToLowerInvariant()
            .Select(c => char.IsLetterOrDigit(c) ? c : '-')
            .ToArray();

        var code = new string(chars);
        while (code.Contains("--")) code = code.Replace("--", "-");
        return code.Trim('-');
    }
}
