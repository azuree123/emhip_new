using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using Emhip.Domain.Events;
using Xunit;

namespace Emhip.UnitTests.Domain;

/// <summary>Covers the engagement-status and urgency rules from the functional spec (§3.3, §4.1, §4.7).</summary>
public class GuestEngagementTests
{
    private static Guest NewGuest() =>
        new(Guid.NewGuid(), "Jordan", "Fielding", new DateOnly(1988, 3, 14), Guid.NewGuid(), consentGiven: true);

    [Fact]
    public void A_registered_guest_starts_as_New()
    {
        Assert.Equal(GuestStatus.New, NewGuest().Status);
    }

    [Fact]
    public void Only_the_initial_conversation_moves_a_guest_to_Active()
    {
        var guest = NewGuest();
        var completedAt = DateTimeOffset.UtcNow;

        guest.ActivateAfterInitialConversation(completedAt);

        Assert.Equal(GuestStatus.Active, guest.Status);
        Assert.Equal(completedAt, guest.LastActivityAt);
    }

    [Fact]
    public void Urgency_is_a_flag_and_never_overwrites_engagement_status()
    {
        var guest = NewGuest(); // still New — the spec's point is that escalation must not hide that

        guest.Escalate();

        Assert.True(guest.IsUrgent);
        Assert.NotNull(guest.UrgentSince);
        Assert.Equal(GuestStatus.New, guest.Status);
    }

    [Fact]
    public void Resolving_urgency_restores_nothing_because_status_was_never_touched()
    {
        var guest = NewGuest();
        guest.ActivateAfterInitialConversation(DateTimeOffset.UtcNow);
        guest.PlaceOnHold();

        guest.Escalate();
        guest.ResolveUrgent();

        Assert.False(guest.IsUrgent);
        Assert.Null(guest.UrgentSince);
        Assert.Equal(GuestStatus.OnHold, guest.Status);
        Assert.Contains(guest.DomainEvents, e => e is UrgentCaseResolvedEvent);
    }

    [Fact]
    public void Escalating_twice_keeps_the_original_urgent_timestamp()
    {
        var guest = NewGuest();
        guest.Escalate();
        var first = guest.UrgentSince;

        guest.Escalate();

        Assert.Equal(first, guest.UrgentSince);
    }

    [Fact]
    public void PlaceOnHold_only_applies_to_Active_guests()
    {
        var newGuest = NewGuest();
        newGuest.PlaceOnHold();
        Assert.Equal(GuestStatus.New, newGuest.Status); // a guest who never engaged isn't "on hold"

        var active = NewGuest();
        active.ActivateAfterInitialConversation(DateTimeOffset.UtcNow);
        active.PlaceOnHold();
        Assert.Equal(GuestStatus.OnHold, active.Status);
    }

    [Fact]
    public void Recording_activity_brings_an_on_hold_guest_back_to_Active()
    {
        var guest = NewGuest();
        guest.ActivateAfterInitialConversation(DateTimeOffset.UtcNow.AddMonths(-6));
        guest.PlaceOnHold();

        guest.RecordActivity(DateTimeOffset.UtcNow);

        Assert.Equal(GuestStatus.Active, guest.Status);
    }

    [Fact]
    public void Recording_older_activity_never_moves_the_last_activity_date_backwards()
    {
        var guest = NewGuest();
        var recent = DateTimeOffset.UtcNow;

        guest.RecordActivity(recent);
        guest.RecordActivity(recent.AddMonths(-2)); // a late-entered historic contact

        Assert.Equal(recent, guest.LastActivityAt);
    }

    [Fact]
    public void Referral_classification_captures_type_and_subcategory()
    {
        var guest = NewGuest();

        guest.SetReferral(ReferralType.Secondary, "Community mental health team", "CMHT");

        Assert.Equal(ReferralType.Secondary, guest.ReferralType);
        Assert.Equal("Community mental health team", guest.ReferralSubcategory);
        Assert.Equal("CMHT", guest.ReferralSource);
    }
}
