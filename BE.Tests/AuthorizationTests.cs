using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using BE.Data;
using BE.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace BE.Tests;

public partial class ApiIntegrationTests : IDisposable
{
    private readonly SqliteConnection connection = new("Data Source=:memory:");
    private readonly WebApplicationFactory<Program> factory;
    private readonly HttpClient client;
    private int trainingId;

    public ApiIntegrationTests()
    {
        connection.Open();
        factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "integration-test-key-at-least-32-bytes-long",
                ["Logging:LogLevel:Default"] = "Warning"
            }));
            builder.ConfigureServices(services =>
            {
                foreach (var descriptor in services.Where(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>) ||
                    (d.ServiceType.IsGenericType && d.ServiceType.GetGenericTypeDefinition().Name == "IDbContextOptionsConfiguration`1" &&
                     d.ServiceType.GenericTypeArguments[0] == typeof(AppDbContext))).ToList()) services.Remove(descriptor);
                services.AddDbContext<AppDbContext>(o => o.UseSqlite(connection));
            });
        });
        client = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), HandleCookies = false });
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.EnsureCreated();
        var owner = new User { Email = "owner@test.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"), Gender = "Other" };
        db.Users.AddRange(owner,
            new User { Email = "other@test.com", PasswordHash = owner.PasswordHash, Gender = "Other" },
            new User { Email = "admin@test.com", PasswordHash = owner.PasswordHash, Gender = "Other", Role = Roles.Admin });
        var training = new Training { User = owner, DurationMinutes = 30, TrainingDate = DateTime.UtcNow, Notes = "Private" };
        db.Trainings.Add(training);
        db.SaveChanges();
        trainingId = training.Id;
    }

    private async Task Login(string email)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password = "Password123!" });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body.GetProperty("token").GetString());
    }

    [Fact]
    public async Task AnonymousGets401UserGets403AndAdminGets200()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/admin/summary")).StatusCode);
        await Login("other@test.com");
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/admin/summary")).StatusCode);
        await Login("admin@test.com");
        var response = await client.GetAsync("/api/admin/summary");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.Equal(3, body.GetProperty("userCount").GetInt32());
        Assert.Equal(1, body.GetProperty("trainingCount").GetInt32());
    }

    [Theory]
    [InlineData("other@test.com")]
    [InlineData("admin@test.com")]
    public async Task NonOwnerCannotReadChangeOrDeleteTraining(string email)
    {
        await Login(email);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/trainings/{trainingId}")).StatusCode);
        var update = new { exerciseType = "Cardio", durationMinutes = 45, calories = 100, intensity = 5, fatigue = 3, trainingDate = DateTime.UtcNow };
        // Use the numeric enum value to avoid depending on an exercise display name.
        var payload = new { exerciseType = 0, update.durationMinutes, update.calories, update.intensity, update.fatigue, update.trainingDate };
        Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsJsonAsync($"/api/trainings/{trainingId}", payload)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync($"/api/trainings/{trainingId}")).StatusCode);
        var list = await client.GetFromJsonAsync<System.Text.Json.JsonElement>("/api/trainings");
        Assert.Equal(0, list.GetArrayLength());
        await Login("owner@test.com");
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/api/trainings/{trainingId}")).StatusCode);
    }

    [Fact]
    public async Task RegistrationCannotGrantAdminRole()
    {
        var response = await client.PostAsJsonAsync("/api/auth/register", new { email = "new@test.com", password = "Password123!", gender = "Other", role = "Admin" });
        response.EnsureSuccessStatusCode();
        await Login("new@test.com");
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/admin/summary")).StatusCode);
    }

    public void Dispose() { client.Dispose(); factory.Dispose(); connection.Dispose(); }
}
