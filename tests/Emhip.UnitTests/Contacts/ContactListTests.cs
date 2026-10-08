using Emhip.Application.Contacts;
using Emhip.Domain.Enums;
using FluentValidation.TestHelper;
using Xunit;

namespace Emhip.UnitTests.Contacts;

public class ContactListLabelsTests
{
    [Theory]
    [InlineData(CaseworkNoteCategory.Casework, "Casework")]
    [InlineData(CaseworkNoteCategory.Activity, "Activity")]
    [InlineData(CaseworkNoteCategory.Hospitality, "Hospitality")]
    [InlineData(CaseworkNoteCategory.Afa, "AFA")]
    [InlineData(CaseworkNoteCategory.Meeting, "Meeting")]
    [InlineData(CaseworkNoteCategory.DailyLog, "Daily Log")]
    public void A_note_reads_as_its_contact_type(CaseworkNoteCategory category, string expected)
    {
        Assert.Equal(expected, ContactListLabels.NoteType(isCpnContact: false, category));
    }

    [Fact]
    public void A_cpn_note_is_a_cpn_session_whatever_category_it_carries()
    {
        Assert.Equal("CPN session", ContactListLabels.NoteType(isCpnContact: true, CaseworkNoteCategory.Afa));
        Assert.Equal("CPN session", ContactListLabels.NoteType(isCpnContact: true, category: null));
    }

    [Fact]
    public void A_note_without_a_category_falls_back_to_contact()
    {
        Assert.Equal("Contact", ContactListLabels.NoteType(isCpnContact: false, category: null));
    }

    [Fact]
    public void A_cpn_session_shows_its_number()
    {
        Assert.Equal("Session 3", ContactListLabels.NoteDetail(true, null, 3, null, null, null));
        Assert.Null(ContactListLabels.NoteDetail(true, null, null, null, null, null));
    }

    [Fact]
    public void An_activity_shows_the_activity_then_the_occasion()
    {
        Assert.Equal("Art group", ContactListLabels.NoteDetail(false, CaseworkNoteCategory.Activity, null, "Art group", "Birthday", null));
        Assert.Equal("Birthday", ContactListLabels.NoteDetail(false, CaseworkNoteCategory.Activity, null, " ", "Birthday", null));
    }

    [Fact]
    public void Afa_shows_the_advice_given_and_other_types_show_nothing()
    {
        Assert.Equal("Housing", ContactListLabels.NoteDetail(false, CaseworkNoteCategory.Afa, null, null, null, "Housing"));
        Assert.Null(ContactListLabels.NoteDetail(false, CaseworkNoteCategory.Casework, null, "Art group", null, "Housing"));
    }
}

public class GetContactListQueryValidatorTests
{
    private readonly GetContactListQueryValidator _validator = new();

    private static GetContactListQuery Query(ContactListKind kind) =>
        new(Guid.NewGuid(), kind, new ContactsByGuestFilter(null, null, null, null, null), Cursor: null, PageSize: 25);

    [Fact]
    public void Accepts_every_tile()
    {
        foreach (var kind in Enum.GetValues<ContactListKind>())
        {
            _validator.TestValidate(Query(kind)).ShouldNotHaveAnyValidationErrors();
        }
    }

    [Fact]
    public void Rejects_an_unknown_tile()
    {
        _validator.TestValidate(Query((ContactListKind)99)).ShouldHaveValidationErrorFor(x => x.Kind);
    }
}
