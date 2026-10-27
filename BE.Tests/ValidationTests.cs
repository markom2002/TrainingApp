using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace BE.Tests;

public partial class ApiIntegrationTests
{
    private static async Task<JsonElement> AssertProblem(HttpResponseMessage response, HttpStatusCode status)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal((int)status, body.GetProperty("status").GetInt32());
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("title").GetString()));
        return body;
    }

    [Theory]
    [InlineData("invalid-email", "Password123!", "Male", "Email")]
    [InlineData("valid@test.com", "short", "Male", "Password")]
    [InlineData("valid@test.com", "Password123!", "unknown", "Gender")]
    public async Task InvalidRegistrationReturnsFieldErrors(string email, string password, string gender, string field)
    {
        var response = await client.PostAsJsonAsync("/api/auth/register", new { email, password, gender });
        var body = await AssertProblem(response, HttpStatusCode.BadRequest);
        Assert.True(body.GetProperty("errors").TryGetProperty(field, out _));
    }

    [Fact]
    public async Task MultibytePasswordCannotExceedBcryptByteLimit()
    {
        var response = await client.PostAsJsonAsync("/api/auth/register", new { email = "valid@test.com", password = new string('ž', 37), gender = "Other" });
        var body = await AssertProblem(response, HttpStatusCode.BadRequest);
        Assert.True(body.GetProperty("errors").TryGetProperty("Password", out _));
    }

    [Fact]
    public async Task DuplicateAccountReturns409AndWrongPasswordReturns401()
    {
        await AssertProblem(await client.PostAsJsonAsync("/api/auth/register", new { email = "owner@test.com", password = "Password123!", gender = "Other" }), HttpStatusCode.Conflict);
        await AssertProblem(await client.PostAsJsonAsync("/api/auth/login", new { email = "owner@test.com", password = "wrong" }), HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task MissingLoginFieldsReturnValidationErrors()
    {
        var body = await AssertProblem(await client.PostAsJsonAsync("/api/auth/login", new { }), HttpStatusCode.BadRequest);
        Assert.True(body.GetProperty("errors").TryGetProperty("Email", out _));
        Assert.True(body.GetProperty("errors").TryGetProperty("Password", out _));
    }

    [Fact]
    public async Task MissingTrainingDateAndExerciseAreRejected()
    {
        await Login("owner@test.com");
        var body = await AssertProblem(await client.PostAsJsonAsync("/api/trainings", new { durationMinutes = 30, calories = 0, intensity = 5, fatigue = 5 }), HttpStatusCode.BadRequest);
        Assert.True(body.GetProperty("errors").TryGetProperty("TrainingDate", out _));
        Assert.True(body.GetProperty("errors").TryGetProperty("ExerciseType", out _));
    }

    [Theory]
    [InlineData("POST")]
    [InlineData("PUT")]
    public async Task InvalidTrainingCannotBeCreatedOrUpdated(string method)
    {
        await Login("owner@test.com");
        var payload = new { exerciseType = 99, durationMinutes = 0, calories = -1, intensity = 11, fatigue = 0, notes = new string('x', 2001), trainingDate = DateTime.UtcNow };
        var response = method == "POST" ? await client.PostAsJsonAsync("/api/trainings", payload) : await client.PutAsJsonAsync($"/api/trainings/{trainingId}", payload);
        var body = await AssertProblem(response, HttpStatusCode.BadRequest);
        foreach (var field in new[] { "ExerciseType", "DurationMinutes", "Calories", "Intensity", "Fatigue", "Notes" })
            Assert.True(body.GetProperty("errors").TryGetProperty(field, out _), field);
        var existing = await client.GetFromJsonAsync<JsonElement>($"/api/trainings/{trainingId}");
        Assert.Equal(30, existing.GetProperty("durationMinutes").GetInt32());
    }

    [Fact]
    public async Task ValidTrainingCanBeCreatedAndUpdated()
    {
        await Login("owner@test.com");
        var payload = new { exerciseType = "Strength", durationMinutes = 45, calories = 100, intensity = 5, fatigue = 3, trainingDate = DateTime.UtcNow };
        var created = await client.PostAsJsonAsync("/api/trainings", payload);
        Assert.Equal(HttpStatusCode.OK, created.StatusCode);
        var training = await created.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/api/trainings/{training.GetProperty("id").GetInt32()}", payload)).StatusCode);
    }

    [Fact]
    public async Task InvalidMonthAndUnknownTrainingHaveProblemResponses()
    {
        await Login("owner@test.com");
        await AssertProblem(await client.GetAsync("/api/trainings/month?year=2026&month=13"), HttpStatusCode.BadRequest);
        await AssertProblem(await client.GetAsync("/api/trainings/999999"), HttpStatusCode.NotFound);
    }
}
