using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace BE.Tests;

public partial class ApiIntegrationTests
{
    [Fact]
    public async Task MonthlyStatisticsAggregateOnlyOwnWorkouts()
    {
        SeedHistory();
        await Login("owner@test.com");
        var stats = await client.GetFromJsonAsync<JsonElement>("/api/trainings/month?year=2026&month=1");
        var week = Assert.Single(stats.EnumerateArray());
        Assert.Equal(1, week.GetProperty("week").GetInt32());
        Assert.Equal(5, week.GetProperty("count").GetInt32());
        Assert.Equal(150, week.GetProperty("totalDuration").GetInt32());
        Assert.Equal(3, week.GetProperty("avgIntensity").GetDouble());
        Assert.Equal(5, week.GetProperty("avgFatigue").GetDouble());
    }

    [Fact]
    public async Task OwnerCanDeleteWorkoutAndItDisappearsFromResults()
    {
        await Login("owner@test.com");
        var deleted = await client.DeleteAsync($"/api/trainings/{trainingId}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        await AssertProblem(await client.GetAsync($"/api/trainings/{trainingId}"), HttpStatusCode.NotFound);
        var history = await client.GetFromJsonAsync<JsonElement>("/api/trainings");
        Assert.Equal(0, history.GetProperty("totalCount").GetInt32());
    }
}
