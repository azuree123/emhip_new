using Emhip.Domain.Common;

namespace Emhip.Domain.Entities;

/// <summary>
/// One DIALOG outcome assessment — the 11 life-domain satisfaction scores (1–7 each,
/// max total 77) used across the register flow's DIALOG step, the workspace DIALOG tab
/// (baseline vs latest, score history) and the outcome-dimension reports. Append-only and
/// versioned per guest like <see cref="RiskAssessment"/>: version 1 is the baseline.
/// </summary>
public class DialogAssessment : Entity
{
    public Guid GuestId { get; private set; }
    public int Version { get; private set; }
    public Guid AssessedByStaffId { get; private set; }
    public DateTimeOffset AssessedAt { get; private set; }

    public int MentalHealth { get; private set; }
    public int PhysicalHealth { get; private set; }
    public int JobSituation { get; private set; }
    public int Accommodation { get; private set; }
    public int LeisureActivities { get; private set; }
    public int FriendshipsSocialLife { get; private set; }
    public int RelationshipWithFamily { get; private set; }
    public int PersonalSafety { get; private set; }
    public int PracticalHelp { get; private set; }
    public int Medication { get; private set; }
    public int MeetingsWithMhStaff { get; private set; }

    public int Total =>
        MentalHealth + PhysicalHealth + JobSituation + Accommodation + LeisureActivities +
        FriendshipsSocialLife + RelationshipWithFamily + PersonalSafety + PracticalHelp +
        Medication + MeetingsWithMhStaff;

    private DialogAssessment() { }

    public DialogAssessment(
        Guid guestId, int version, Guid assessedByStaffId,
        int mentalHealth, int physicalHealth, int jobSituation, int accommodation,
        int leisureActivities, int friendshipsSocialLife, int relationshipWithFamily,
        int personalSafety, int practicalHelp, int medication, int meetingsWithMhStaff)
    {
        static int Clamp(int score) => Math.Clamp(score, 1, 7);

        GuestId = guestId;
        Version = version;
        AssessedByStaffId = assessedByStaffId;
        AssessedAt = DateTimeOffset.UtcNow;
        MentalHealth = Clamp(mentalHealth);
        PhysicalHealth = Clamp(physicalHealth);
        JobSituation = Clamp(jobSituation);
        Accommodation = Clamp(accommodation);
        LeisureActivities = Clamp(leisureActivities);
        FriendshipsSocialLife = Clamp(friendshipsSocialLife);
        RelationshipWithFamily = Clamp(relationshipWithFamily);
        PersonalSafety = Clamp(personalSafety);
        PracticalHelp = Clamp(practicalHelp);
        Medication = Clamp(medication);
        MeetingsWithMhStaff = Clamp(meetingsWithMhStaff);
    }

    /// <summary>Migration only — preserves the date the historic assessment was actually taken (§7.2).</summary>
    public void OverwriteAssessedAt(DateTimeOffset assessedAt) => AssessedAt = assessedAt;
}
