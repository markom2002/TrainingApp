using System.Net.Http.Json;
using System.Text.Json;
using Xunit;
namespace BE.Tests;
public partial class ApiIntegrationTests
{
    [Fact]
    public async Task OfflineRetriesReturnOneWorkoutAndKeepAccountsSeparate()
    {
        var clientId=Guid.NewGuid();
        var payload=new{clientId,exerciseType="Strength",durationMinutes=45,calories=0,intensity=7,fatigue=5,trainingDate=new DateTime(2026,11,14,12,0,0),exercises=Array.Empty<object>()};
        await Login("owner@test.com");
        var first=await client.PostAsJsonAsync("/api/trainings",payload);first.EnsureSuccessStatusCode();
        var id=(await first.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        var retry=await client.PostAsJsonAsync("/api/trainings",payload);retry.EnsureSuccessStatusCode();
        Assert.Equal(id,(await retry.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32());
        await Login("other@test.com");
        var other=await client.PostAsJsonAsync("/api/trainings",payload);other.EnsureSuccessStatusCode();
        Assert.NotEqual(id,(await other.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32());
    }
}
