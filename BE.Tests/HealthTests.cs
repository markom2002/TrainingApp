using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace BE.Tests;

public partial class ApiIntegrationTests
{
    [Fact]
    public async Task LivenessIsPublicAndDoesNotExposeConfiguration()
    {
        var response = await client.GetAsync("/health/live");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Healthy", body.GetProperty("status").GetString());
        Assert.Single(body.EnumerateObject());
    }
}
