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
    public async Task ProfileRequiresAuthenticationAndReturnsOnlyOwnTotals()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/profile")).StatusCode);
        SeedHistory();
        await Login("owner@test.com");
        var profile = await client.GetFromJsonAsync<JsonElement>("/api/profile");
        Assert.Equal("owner@test.com", profile.GetProperty("email").GetString());
        Assert.Equal(5, profile.GetProperty("totalWorkouts").GetInt32());
        Assert.Equal(150, profile.GetProperty("totalMinutes").GetInt32());
        Assert.Equal(3, profile.GetProperty("weeklyGoal").GetInt32());
        Assert.False(profile.TryGetProperty("passwordHash", out _));
    }

    [Fact]
    public async Task ProfileUpdatePersistsAllowedFieldsAndCannotChangeRoleOrAnotherUser()
    {
        await Login("owner@test.com");
        var response = await client.PutAsJsonAsync("/api/profile", new { displayName = "  Marko  ", bio = "Training for consistency.", goal = "Build strength", experience = "Intermediate", weeklyGoal = 4, role = "Admin", email = "other@test.com", userId = 2 });
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var profile = await client.GetFromJsonAsync<JsonElement>("/api/profile");
        Assert.Equal("Marko", profile.GetProperty("displayName").GetString());
        Assert.Equal("Build strength", profile.GetProperty("goal").GetString());
        Assert.Equal(4, profile.GetProperty("weeklyGoal").GetInt32());
        Assert.Equal("User", profile.GetProperty("role").GetString());
        Assert.Equal("owner@test.com", profile.GetProperty("email").GetString());
        await Login("other@test.com");
        var other = await client.GetFromJsonAsync<JsonElement>("/api/profile");
        Assert.Equal("other", other.GetProperty("displayName").GetString());
        Assert.Equal(3, other.GetProperty("weeklyGoal").GetInt32());
    }

    [Theory]
    [InlineData("", 3, "Beginner", "Stay consistent")]
    [InlineData("Name", 0, "Beginner", "Stay consistent")]
    [InlineData("Name", 8, "Beginner", "Stay consistent")]
    [InlineData("Name", 3, "Expert", "Stay consistent")]
    [InlineData("Name", 3, "Beginner", "Invalid goal")]
    public async Task InvalidProfileChangesAreRejected(string displayName, int weeklyGoal, string experience, string goal)
    {
        await Login("owner@test.com");
        await AssertProblem(await client.PutAsJsonAsync("/api/profile", new { displayName, weeklyGoal, experience, goal, bio = "" }), HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task WeeklyProfileProgressCountsOwnSessionsWithinCurrentWeek()
    {
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Trainings.RemoveRange(db.Trainings);
            var user = db.Users.Single(u => u.Email == "owner@test.com");
            var today = DateTime.UtcNow.Date;
            var start = today.AddDays(-((int)today.DayOfWeek + 6) % 7);
            db.Trainings.AddRange(new Training { UserId = user.Id, TrainingDate = start, DurationMinutes = 45 },
                new Training { UserId = user.Id, TrainingDate = start.AddDays(-1), DurationMinutes = 30 },
                new Training { UserId = user.Id, TrainingDate = start.AddDays(7), DurationMinutes = 50 });
            db.SaveChanges();
        }
        await Login("owner@test.com");
        var profile = await client.GetFromJsonAsync<JsonElement>("/api/profile");
        Assert.Equal(1, profile.GetProperty("weeklyWorkouts").GetInt32());
        Assert.Equal(3, profile.GetProperty("totalWorkouts").GetInt32());
    }
}
