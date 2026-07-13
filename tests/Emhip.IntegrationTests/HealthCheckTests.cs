using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Emhip.IntegrationTests;

/// <summary>
/// Full request-pipeline smoke test via WebApplicationFactory&lt;Program&gt;. Deliberately hits
/// /health rather than a data endpoint — the DB-backed endpoints need a real SQL Server
/// (Testcontainers in CI; see ARCHITECTURE.md's tests/Emhip.IntegrationTests layout) which
/// isn't available in every dev/sandbox environment.
/// </summary>
public class HealthCheckTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Health_endpoint_returns_ok()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/health");

        response.EnsureSuccessStatusCode();
    }
}
