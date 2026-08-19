using Emhip.Application.Emails;
using Xunit;

namespace Emhip.UnitTests.Emails;

public class TemplateRendererTests
{
    [Fact]
    public void Replaces_tokens_including_whitespace_variants()
    {
        var tokens = new Dictionary<string, string?> { ["guestName"] = "Jordan Fielding", ["reference"] = "G-1042" };

        var result = TemplateRenderer.Render("{{guestName}} ({{ reference }}) was flagged", tokens);

        Assert.Equal("Jordan Fielding (G-1042) was flagged", result);
    }

    [Fact]
    public void Unknown_and_null_tokens_render_as_empty_rather_than_leaking_the_placeholder()
    {
        var tokens = new Dictionary<string, string?> { ["known"] = null };

        var result = TemplateRenderer.Render("[{{known}}][{{missing}}]", tokens);

        Assert.Equal("[][]", result);
    }

    [Fact]
    public void Token_matching_is_case_insensitive_when_the_dictionary_is()
    {
        var tokens = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase) { ["organisationName"] = "EMHIP" };

        Assert.Equal("EMHIP", TemplateRenderer.Render("{{OrganisationName}}", tokens));
    }

    [Fact]
    public void StripHtml_produces_readable_plain_text()
    {
        const string html = "<div><h1>Overdue follow-ups</h1><p>You have <strong>3</strong> overdue.</p><ul><li>Jordan &amp; Sam</li></ul></div>";

        var text = TemplateRenderer.StripHtml(html);

        Assert.Contains("Overdue follow-ups", text);
        Assert.Contains("You have 3 overdue.", text);
        Assert.Contains("Jordan & Sam", text); // entities decoded
        Assert.DoesNotContain("<", text);
    }

    [Fact]
    public void Every_catalog_template_renders_with_its_documented_tokens_and_leaves_nothing_unfilled()
    {
        foreach (var definition in EmailTemplateCatalog.All)
        {
            var tokens = TemplateRenderer.SampleTokens(definition, "EMHIP", "https://portal.example.org");

            var subject = TemplateRenderer.Render(definition.DefaultSubject, tokens);
            var body = TemplateRenderer.Render(definition.DefaultHtmlBody, tokens);

            Assert.DoesNotContain("{{", subject);
            Assert.DoesNotContain("{{", body);
            Assert.NotEmpty(subject);

            // Sample data must cover every token the editor advertises for this template.
            foreach (var token in definition.Tokens.Concat(EmailTemplateCatalog.CommonTokens))
            {
                Assert.True(tokens.ContainsKey(token), $"Sample data is missing '{token}' for template '{definition.Key}'.");
            }
        }
    }

    [Fact]
    public void Catalog_keys_are_unique()
    {
        var keys = EmailTemplateCatalog.All.Select(t => t.Key).ToList();
        Assert.Equal(keys.Count, keys.Distinct(StringComparer.OrdinalIgnoreCase).Count());
    }
}
