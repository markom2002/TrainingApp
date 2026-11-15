using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BE.Data;
using BE.Services.Implementations;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Mvc.Testing;
using System.Net.Http.Headers;
using Xunit;

namespace BE.Tests;

public partial class ApiIntegrationTests
{
    [Fact]
    public async Task EnabledDemoIssuesNormalPrivateSessionsWithSyntheticHistory()
    {
        using var demo = factory.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Demo:Enabled"] = "true",
                // The inherited fixture replaces the provider with isolated SQLite.
                ["ConnectionStrings:DefaultConnection"] = "Server=unused;Database=TrainingDemo"
            })));
        using var visitor = demo.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"), HandleCookies = false
        });
        using var response = await visitor.PostAsJsonAsync("/api/auth/demo", new { });
        response.EnsureSuccessStatusCode();
        Assert.Contains("secure", response.Headers.GetValues("Set-Cookie").Single(), StringComparison.OrdinalIgnoreCase);
        var token = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString();
        visitor.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var history = await visitor.GetFromJsonAsync<JsonElement>("/api/trainings");
        Assert.Equal(8, history.GetProperty("totalCount").GetInt32());
        Assert.Equal(HttpStatusCode.Forbidden, (await visitor.GetAsync("/api/admin/summary")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await visitor.GetAsync($"/api/trainings/{trainingId}")).StatusCode);
    }

    [Fact]
    public void DemoCannotStartWithPersonalDatabaseConfiguration()
    {
        using var invalid = factory.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Demo:Enabled"] = "true",
                ["ConnectionStrings:DefaultConnection"] = "Server=unused;Database=PersonalWorkouts"
            })));
        var exception = Assert.Throws<InvalidOperationException>(() => invalid.CreateClient());
        Assert.Contains("separate database named TrainingDemo", exception.Message);
    }

    [Fact]
    public async Task DemoIsDisabledForPersonalAppAndDoesNotCreateAccounts()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var before = await db.Users.CountAsync();
        var config = await client.GetFromJsonAsync<JsonElement>("/api/auth/demo");
        Assert.False(config.GetProperty("enabled").GetBoolean());
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsJsonAsync("/api/auth/demo", new { })).StatusCode);
        Assert.Equal(before, await db.Users.CountAsync());
    }

    [Fact]
    public async Task DemoSeedCreatesSeparateVisitorsAndNeverChangesExistingWorkouts()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var original = await db.Trainings.AsNoTracking().Where(t => t.Id == trainingId).Select(t => t.Notes).SingleAsync();
        var first = await DemoSessionService.CreateAsync(db, default);
        var second = await DemoSessionService.CreateAsync(db, default);
        Assert.NotEqual(first.Id, second.Id);
        Assert.Equal(8, await db.Trainings.CountAsync(t => t.UserId == first.Id));
        Assert.Equal(8, await db.Trainings.CountAsync(t => t.UserId == second.Id));
        Assert.Equal(original, await db.Trainings.AsNoTracking().Where(t => t.Id == trainingId).Select(t => t.Notes).SingleAsync());
        Assert.Equal("User", first.Role);
        Assert.Contains(first.Trainings.SelectMany(t => t.Exercises), e => e.WeightUnit == "lbs");
        Assert.Contains(first.Trainings.SelectMany(t => t.Exercises), e => e.WeightUnit == "kg");
    }
}
