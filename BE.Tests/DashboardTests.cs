using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BE.Data;
using BE.Models;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace BE.Tests;

public partial class ApiIntegrationTests
{
    [Fact]
    public async Task OverviewAggregatesOwnMonthAndIncludesExerciseMix()
    {
        SeedHistory();
        await Login("owner@test.com");
        var result = await client.GetFromJsonAsync<JsonElement>("/api/trainings/overview?year=2026&month=1");
        Assert.Equal(5, result.GetProperty("workouts").GetInt32());
        Assert.Equal(150, result.GetProperty("minutes").GetInt32());
        Assert.Equal(500, result.GetProperty("calories").GetInt32());
        Assert.Equal(3, result.GetProperty("averageIntensity").GetDouble());
        Assert.Equal(5, result.GetProperty("averageFatigue").GetDouble());
        Assert.Equal(JsonValueKind.Null, result.GetProperty("workoutChangePercent").ValueKind);
        var week = Assert.Single(result.GetProperty("weeklyActivity").EnumerateArray());
        Assert.Equal(150, week.GetProperty("minutes").GetInt32());
        var cardio = result.GetProperty("exerciseBreakdown")[0];
        Assert.Equal("Cardio", cardio.GetProperty("exerciseType").GetString());
        Assert.Equal(3, cardio.GetProperty("workouts").GetInt32());
        Assert.Equal(90, cardio.GetProperty("minutes").GetInt32());
    }

    [Fact]
    public async Task OverviewComparesWithPreviousMonthAcrossYearBoundary()
    {
        SeedHistory();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var owner = db.Users.Single(u => u.Email == "owner@test.com").Id;
            db.Trainings.Add(new Training { UserId = owner, TrainingDate = new DateTime(2025, 12, 31, 23, 59, 0), DurationMinutes = 30 });
            db.Trainings.Add(new Training { UserId = owner, TrainingDate = new DateTime(2026, 2, 1), DurationMinutes = 999 });
            db.SaveChanges();
        }
        await Login("owner@test.com");
        var result = await client.GetFromJsonAsync<JsonElement>("/api/trainings/overview?year=2026&month=1");
        Assert.Equal(5, result.GetProperty("workouts").GetInt32());
        Assert.Equal(1, result.GetProperty("previousWorkouts").GetInt32());
        Assert.Equal(400, result.GetProperty("workoutChangePercent").GetDouble());
    }

    [Fact]
    public async Task EmptyOverviewHasZeroTotalsAndNoFabricatedActivity()
    {
        await Login("other@test.com");
        var result = await client.GetFromJsonAsync<JsonElement>("/api/trainings/overview?year=2026&month=1");
        foreach (var field in new[] { "workouts", "minutes", "calories", "averageIntensity", "averageFatigue" })
            Assert.Equal(0, result.GetProperty(field).GetDouble());
        Assert.Empty(result.GetProperty("weeklyActivity").EnumerateArray());
        Assert.Empty(result.GetProperty("exerciseBreakdown").EnumerateArray());
    }

    [Theory]
    [InlineData("year=1&month=1")]
    [InlineData("year=9999&month=12")]
    [InlineData("year=2026&month=0")]
    public async Task InvalidOverviewDatesReturnValidationErrors(string query)
    {
        await Login("owner@test.com");
        await AssertProblem(await client.GetAsync($"/api/trainings/overview?{query}"), HttpStatusCode.BadRequest);
    }
}
