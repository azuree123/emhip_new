using Emhip.Application.Guests;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using Xunit;

namespace Emhip.UnitTests.Guests;

/// <summary>"How did you hear about us?" — the tickbox list on the wire versus the bit mask on the guest.</summary>
public class HeardAboutUsSourcesTests
{
    [Fact]
    public void Combine_ors_the_ticked_boxes_into_one_mask()
    {
        var mask = HeardAboutUsSources.Combine([HeardAboutUsSource.Nhs, HeardAboutUsSource.SocialMedia]);

        Assert.Equal(HeardAboutUsSource.Nhs | HeardAboutUsSource.SocialMedia, mask);
    }

    [Fact]
    public void Nothing_ticked_is_None()
    {
        Assert.Equal(HeardAboutUsSource.None, HeardAboutUsSources.Combine(null));
        Assert.Equal(HeardAboutUsSource.None, HeardAboutUsSources.Combine([]));
        Assert.Empty(HeardAboutUsSources.Split(HeardAboutUsSource.None));
    }

    [Fact]
    public void A_box_sent_twice_counts_once()
    {
        var mask = HeardAboutUsSources.Combine([HeardAboutUsSource.Outreach, HeardAboutUsSource.Outreach]);

        Assert.Equal([HeardAboutUsSource.Outreach], HeardAboutUsSources.Split(mask));
    }

    [Fact]
    public void Split_lists_the_boxes_in_form_order()
    {
        var mask = HeardAboutUsSource.Other | HeardAboutUsSource.Nhs | HeardAboutUsSource.Outreach;

        Assert.Equal(
            [HeardAboutUsSource.Nhs, HeardAboutUsSource.Outreach, HeardAboutUsSource.Other],
            HeardAboutUsSources.Split(mask));
    }

    [Fact]
    public void Every_combination_round_trips()
    {
        for (var bits = 0; bits < 32; bits++)
        {
            var mask = (HeardAboutUsSource)bits;
            Assert.Equal(mask, HeardAboutUsSources.Combine(HeardAboutUsSources.Split(mask)));
        }
    }

    [Fact]
    public void Describe_uses_the_form_labels_and_the_other_text()
    {
        var mask = HeardAboutUsSource.Nhs | HeardAboutUsSource.OtherStatutoryServices | HeardAboutUsSource.Other;

        Assert.Equal("NHS, Other statutory services, Other — A friend", HeardAboutUsSources.Describe(mask, " A friend "));
        Assert.Equal("Social media", HeardAboutUsSources.Describe(HeardAboutUsSource.SocialMedia, "ignored"));
        Assert.Null(HeardAboutUsSources.Describe(HeardAboutUsSource.None, null));
    }

    [Fact]
    public void The_guest_keeps_the_other_text_only_while_Other_is_ticked()
    {
        var guest = new Guest(Guid.NewGuid(), "Jordan", "Fielding", new DateOnly(1988, 3, 14), Guid.NewGuid(), consentGiven: true);

        guest.SetHeardAboutUs(HeardAboutUsSource.SocialMedia | HeardAboutUsSource.Other, "  Community radio ");
        Assert.Equal(HeardAboutUsSource.SocialMedia | HeardAboutUsSource.Other, guest.HeardAboutUs);
        Assert.Equal("Community radio", guest.HeardAboutUsOther);

        guest.SetHeardAboutUs(HeardAboutUsSource.SocialMedia, "Community radio");
        Assert.Equal(HeardAboutUsSource.SocialMedia, guest.HeardAboutUs);
        Assert.Null(guest.HeardAboutUsOther);
    }
}
