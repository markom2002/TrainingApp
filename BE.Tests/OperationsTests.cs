using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace BE.Tests;

public partial class ApiIntegrationTests
{
    [Fact]
    public async Task ReadinessChecksDatabaseWithoutExposingConnectionDetails()
    {
        using var response = await client.GetAsync("/health/ready");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Healthy", result.GetProperty("status").GetString());
        Assert.Single(result.EnumerateObject());
        Assert.True(response.Headers.Contains("X-Request-ID"));
    }

    [Fact]
    public async Task RepeatedSignInAttemptsReturnProblemDetailsAndRetryAfter()
    {
        using var limited = factory.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?> { ["Security:AuthRequestsPerMinute"] = "2" })));
        using var http = limited.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        for (var attempt = 0; attempt < 2; attempt++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await http.PostAsJsonAsync("/api/auth/login", new { email = "missing@example.test", password = "Invalid123!" })).StatusCode);
        using var rejected = await http.PostAsJsonAsync("/api/auth/login", new { email = "missing@example.test", password = "Invalid123!" });
        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
        Assert.NotNull(rejected.Headers.RetryAfter);
        Assert.Equal("application/problem+json", rejected.Content.Headers.ContentType?.MediaType);
        Assert.Equal(429, (await rejected.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetInt32());
        Assert.Equal(HttpStatusCode.OK, (await http.GetAsync("/health/live")).StatusCode);
    }
}
