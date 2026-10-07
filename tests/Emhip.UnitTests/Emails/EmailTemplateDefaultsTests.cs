using Emhip.Domain.Entities;

namespace Emhip.UnitTests.Emails;

public class EmailTemplateDefaultsTests
{
    [Fact]
    public void An_untouched_template_takes_the_catalogs_current_wording()
    {
        var template = new EmailTemplate("follow-up-overdue", "Overdue follow-ups", "Overdue follow-ups", "<p>old</p>");

        var changed = template.ApplyCatalogDefaults("Contact overdue", "Overdue contacts", "<p>new</p>");

        Assert.True(changed);
        Assert.Equal("Contact overdue", template.Name);
        Assert.Equal("Overdue contacts", template.Subject);
        Assert.Equal("<p>new</p>", template.HtmlBody);
    }

    [Fact]
    public void A_template_an_admin_edited_keeps_its_wording()
    {
        var template = new EmailTemplate("follow-up-overdue", "Overdue follow-ups", "Overdue follow-ups", "<p>old</p>");
        template.Update("Our own subject", "<p>our own body</p>", null, true, Guid.NewGuid());

        template.ApplyCatalogDefaults("Contact overdue", "Overdue contacts", "<p>new</p>");

        Assert.Equal("Contact overdue", template.Name);
        Assert.Equal("Our own subject", template.Subject);
        Assert.Equal("<p>our own body</p>", template.HtmlBody);
    }

    [Fact]
    public void A_template_already_on_the_catalog_wording_is_left_alone()
    {
        var template = new EmailTemplate("k", "Name", "Subject", "<p>body</p>");

        Assert.False(template.ApplyCatalogDefaults("Name", "Subject", "<p>body</p>"));
    }
}
