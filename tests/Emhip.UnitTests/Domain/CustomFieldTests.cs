using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using Xunit;

namespace Emhip.UnitTests.Domain;

public class CustomFieldTests
{
    private static CustomFieldDefinition NewDefinition(CustomFieldType type = CustomFieldType.Text, string? options = null) =>
        new(CustomFieldEntityType.Guest, "preferred-pronoun", "Preferred pronoun", type, options, helpText: null, isRequired: false, sortOrder: 1);

    [Fact]
    public void Option_list_splits_and_trims_and_ignores_blank_lines()
    {
        var definition = NewDefinition(CustomFieldType.Select, "She/her\n  He/him  \n\nThey/them\n");

        Assert.Equal(["She/her", "He/him", "They/them"], definition.OptionList());
    }

    [Fact]
    public void Option_list_is_empty_when_no_options_are_configured()
    {
        Assert.Empty(NewDefinition().OptionList());
    }

    [Fact]
    public void Update_changes_presentation_but_never_the_key()
    {
        var definition = NewDefinition();
        var originalKey = definition.Key;

        definition.Update("Pronouns", CustomFieldType.MultilineText, null, "How the guest wishes to be addressed", isRequired: true, sortOrder: 5, isActive: false);

        Assert.Equal(originalKey, definition.Key);
        Assert.Equal(CustomFieldEntityType.Guest, definition.EntityType);
        Assert.Equal("Pronouns", definition.Label);
        Assert.True(definition.IsRequired);
        Assert.False(definition.IsActive);
        Assert.Equal(5, definition.SortOrder);
    }

    [Theory]
    [InlineData(null, null, null, null, true)]
    [InlineData("   ", null, null, null, true)] // whitespace is not an answer
    [InlineData("She/her", null, null, null, false)]
    public void IsEmpty_reflects_whether_anything_was_actually_entered(
        string? text, double? number, bool hasDate, bool? boolean, bool expectedEmpty)
    {
        var value = new CustomFieldValue(Guid.NewGuid(), CustomFieldEntityType.Guest, Guid.NewGuid());
        value.Set(text, (decimal?)number, hasDate ? new DateOnly(2026, 1, 1) : null, boolean, updatedByStaffId: null);

        Assert.Equal(expectedEmpty, value.IsEmpty);
    }

    [Fact]
    public void A_number_date_or_boolean_answer_counts_as_filled_even_with_no_text()
    {
        var definitionId = Guid.NewGuid();
        var entityId = Guid.NewGuid();

        var number = new CustomFieldValue(definitionId, CustomFieldEntityType.Guest, entityId);
        number.Set(null, 42m, null, null, null);

        var date = new CustomFieldValue(definitionId, CustomFieldEntityType.Guest, entityId);
        date.Set(null, null, new DateOnly(2026, 8, 19), null, null);

        var boolean = new CustomFieldValue(definitionId, CustomFieldEntityType.Guest, entityId);
        boolean.Set(null, null, null, true, null);

        Assert.False(number.IsEmpty);
        Assert.False(date.IsEmpty);
        Assert.False(boolean.IsEmpty);
    }

    [Fact]
    public void Clinical_instruments_are_not_extensible_scopes()
    {
        // The enum is the guard: DIALOG and risk assessment must never become configurable forms.
        var names = Enum.GetNames<CustomFieldEntityType>();

        Assert.DoesNotContain("DialogAssessment", names);
        Assert.DoesNotContain("RiskAssessment", names);
    }
}
