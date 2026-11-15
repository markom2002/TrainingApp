using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using BE.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace BE.Tests;

public sealed class SqlServerFactAttribute : FactAttribute
{
    public SqlServerFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("TRAINING_TEST_SQL")))
            Skip = "Set TRAINING_TEST_SQL to run isolated SQL Server integration tests.";
    }
}

// The supplied connection selects a server, never a database to overwrite.
// Each run creates and drops only its own randomly named database.
public sealed class SqlServerFixture : IAsyncLifetime
{
    public WebApplicationFactory<Program> Factory { get; private set; } = null!;
    public string DatabaseName { get; } = "TrainingTests_" + Guid.NewGuid().ToString("N");
    private bool databaseInitialized;

    public async Task InitializeAsync()
    {
        var configured = Environment.GetEnvironmentVariable("TRAINING_TEST_SQL");
        if (string.IsNullOrWhiteSpace(configured)) return;
        var connection = new SqlConnectionStringBuilder(configured) { InitialCatalog = DatabaseName };
        Factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = connection.ConnectionString,
                ["Jwt:Key"] = "isolated-sql-integration-test-signing-key-32-bytes",
                ["Logging:LogLevel:Default"] = "Warning"
            }));
            builder.ConfigureServices(services =>
            {
                foreach (var descriptor in services.Where(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>) ||
                    (d.ServiceType.IsGenericType && d.ServiceType.GetGenericTypeDefinition().Name == "IDbContextOptionsConfiguration`1" &&
                     d.ServiceType.GenericTypeArguments[0] == typeof(AppDbContext))).ToList()) services.Remove(descriptor);
                services.AddDbContext<AppDbContext>(options => options.UseSqlServer(connection.ConnectionString));
            });
        });
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(DatabaseName, db.Database.GetDbConnection().Database);
        databaseInitialized = true;
        await db.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        if (Factory is null) return;
        if (!databaseInitialized) { await Factory.DisposeAsync(); return; }
        try
        {
            await using var scope = Factory.Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            if (db.Database.GetDbConnection().Database != DatabaseName || !DatabaseName.StartsWith("TrainingTests_"))
                throw new InvalidOperationException("Refusing to delete an unexpected database.");
            await db.Database.EnsureDeletedAsync();
        }
        finally { await Factory.DisposeAsync(); }
    }

    public async Task<HttpClient> SignedInClient()
    {
        var client = Factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"), HandleCookies = false
        });
        var credentials = new { email = Guid.NewGuid().ToString("N") + "@example.test", password = "SqlIntegration123!" };
        (await client.PostAsJsonAsync("/api/auth/register", new { credentials.email, credentials.password, gender = "Other" })).EnsureSuccessStatusCode();
        var response = await client.PostAsJsonAsync("/api/auth/login", credentials);
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body.GetProperty("token").GetString());
        return client;
    }
}

public sealed class SqlServerTests(SqlServerFixture fixture) : IClassFixture<SqlServerFixture>
{
    private static object Workout(Guid? clientId = null) => new
    {
        clientId, exerciseType = "Strength", durationMinutes = 45, calories = 0,
        intensity = 7, fatigue = 5, trainingDate = new DateTime(2026, 1, 10, 12, 0, 0),
        exercises = new[] { new { exerciseId = "lat-pulldown", sets = 1, reps = 8,
            weightKg = 13.61m, weightValue = 30m, weightUnit = "lbs" } }
    };

    [SqlServerFact]
    public async Task AllMigrationsApplyAndRetryIndexIsFilteredAndUnique()
    {
        await using var scope = fixture.Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Empty(await db.Database.GetPendingMigrationsAsync());
        Assert.NotEmpty(await db.Database.GetAppliedMigrationsAsync());
        await db.Database.OpenConnectionAsync();
        await using var command = db.Database.GetDbConnection().CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM sys.indexes WHERE object_id = OBJECT_ID('Trainings') AND name = 'IX_Trainings_UserId_ClientId' AND is_unique = 1 AND has_filter = 1";
        Assert.Equal(1, Convert.ToInt32(await command.ExecuteScalarAsync()));
    }

    [SqlServerFact]
    public async Task ConcurrentOfflineRetriesReturnExactlyOneWorkout()
    {
        using var owner = await fixture.SignedInClient();
        var payload = Workout(Guid.NewGuid());
        var responses = await Task.WhenAll(Enumerable.Range(0, 4).Select(_ => owner.PostAsJsonAsync("/api/trainings", payload)));
        var ids = new List<int>();
        foreach (var response in responses)
        {
            response.EnsureSuccessStatusCode();
            ids.Add((await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32());
            response.Dispose();
        }
        Assert.Single(ids.Distinct());
        var history = await owner.GetFromJsonAsync<JsonElement>("/api/trainings");
        Assert.Equal(1, history.GetProperty("totalCount").GetInt32());
    }

    [SqlServerFact]
    public async Task ConfirmedWriteCanBeRetriedAfterLostResponseAndKeepsExactPounds()
    {
        using var owner = await fixture.SignedInClient();
        var payload = Workout(Guid.NewGuid());
        // Discard the first response as if the client never received confirmation.
        using (var ignored = await owner.PostAsJsonAsync("/api/trainings", payload)) ignored.EnsureSuccessStatusCode();
        using var retry = await owner.PostAsJsonAsync("/api/trainings", payload);
        retry.EnsureSuccessStatusCode();
        var saved = await retry.Content.ReadFromJsonAsync<JsonElement>();
        var exercise = Assert.Single(saved.GetProperty("exercises").EnumerateArray());
        Assert.Equal("lbs", exercise.GetProperty("weightUnit").GetString());
        Assert.Equal(30m, exercise.GetProperty("weightValue").GetDecimal());
        Assert.Equal(13.61m, exercise.GetProperty("weightKg").GetDecimal());
        var history = await owner.GetFromJsonAsync<JsonElement>("/api/trainings");
        Assert.Equal(1, history.GetProperty("totalCount").GetInt32());
    }

    [SqlServerFact]
    public async Task SameRetryIdAcrossAccountsNeverExposesAnotherOwnersWorkout()
    {
        using var owner = await fixture.SignedInClient();
        using var other = await fixture.SignedInClient();
        var payload = Workout(Guid.NewGuid());
        using var created = await owner.PostAsJsonAsync("/api/trainings", payload);
        created.EnsureSuccessStatusCode();
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"/api/trainings/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.PutAsJsonAsync($"/api/trainings/{id}", payload)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.DeleteAsync($"/api/trainings/{id}")).StatusCode);
        using var own = await other.PostAsJsonAsync("/api/trainings", payload);
        own.EnsureSuccessStatusCode();
        Assert.NotEqual(id, (await own.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32());
    }
}
