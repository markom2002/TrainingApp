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
    private void SeedHistory()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Trainings.RemoveRange(db.Trainings);
        var ownerId = db.Users.Single(u => u.Email == "owner@test.com").Id;
        var otherId = db.Users.Single(u => u.Email == "other@test.com").Id;
        for (var day = 1; day <= 5; day++)
            db.Trainings.Add(new Training
            {
                UserId = ownerId, TrainingDate = new DateTime(2026, 1, day, 23, 59, 0),
                ExerciseType = day % 2 == 0 ? ExerciseType.Strength : ExerciseType.Cardio,
                DurationMinutes = day * 10, Calories = 100, Intensity = day, Fatigue = 5
            });
        db.Trainings.Add(new Training { UserId = otherId, TrainingDate = new DateTime(2026, 1, 3), DurationMinutes = 999, Calories = 100 });
        db.SaveChanges();
    }

    [Fact]
    public async Task PaginationCountsOnlyOwnRecordsAndPagesDoNotOverlap()
    {
        SeedHistory();
        await Login("owner@test.com");
        var first = await client.GetFromJsonAsync<JsonElement>("/api/trainings?page=1&pageSize=2");
        var second = await client.GetFromJsonAsync<JsonElement>("/api/trainings?page=2&pageSize=2");
        Assert.Equal(5, first.GetProperty("totalCount").GetInt32());
        Assert.Equal(3, first.GetProperty("totalPages").GetInt32());
        Assert.Equal(2, first.GetProperty("pageSize").GetInt32());
        Assert.Equal(2, second.GetProperty("page").GetInt32());
        var firstIds = first.GetProperty("items").EnumerateArray().Select(t => t.GetProperty("id").GetInt32()).ToArray();
        var secondIds = second.GetProperty("items").EnumerateArray().Select(t => t.GetProperty("id").GetInt32()).ToArray();
        Assert.Empty(firstIds.Intersect(secondIds));
        Assert.Equal(50, first.GetProperty("items")[0].GetProperty("durationMinutes").GetInt32());
        var last = await client.GetFromJsonAsync<JsonElement>("/api/trainings?page=3&pageSize=2");
        Assert.Single(last.GetProperty("items").EnumerateArray());
        var beyond = await client.GetFromJsonAsync<JsonElement>("/api/trainings?page=4&pageSize=2");
        Assert.Empty(beyond.GetProperty("items").EnumerateArray());
        Assert.Equal(5, beyond.GetProperty("totalCount").GetInt32());
    }

    [Fact]
    public async Task CombinedFiltersIncludeWholeEndDateAndCountFilteredRecords()
    {
        SeedHistory();
        await Login("owner@test.com");
        var result = await client.GetFromJsonAsync<JsonElement>("/api/trainings?exerciseType=Cardio&from=2026-01-03&to=2026-01-05&sortBy=durationMinutes&sortDirection=asc&pageSize=1");
        Assert.Equal(2, result.GetProperty("totalCount").GetInt32());
        Assert.Equal(2, result.GetProperty("totalPages").GetInt32());
        Assert.Equal(30, result.GetProperty("items")[0].GetProperty("durationMinutes").GetInt32());
        var last = await client.GetFromJsonAsync<JsonElement>("/api/trainings?exerciseType=Cardio&from=2026-01-03&to=2026-01-05&sortBy=durationMinutes&sortDirection=asc&pageSize=1&page=2");
        Assert.Equal(50, last.GetProperty("items")[0].GetProperty("durationMinutes").GetInt32());
    }

    [Theory]
    [InlineData("trainingDate")]
    [InlineData("durationMinutes")]
    [InlineData("intensity")]
    public async Task SupportedSortFieldsWorkInBothDirections(string sortBy)
    {
        SeedHistory();
        await Login("owner@test.com");
        var ascending = await client.GetFromJsonAsync<JsonElement>($"/api/trainings?sortBy={sortBy}&sortDirection=asc");
        var descending = await client.GetFromJsonAsync<JsonElement>($"/api/trainings?sortBy={sortBy}&sortDirection=desc");
        Assert.Equal(10, ascending.GetProperty("items")[0].GetProperty("durationMinutes").GetInt32());
        Assert.Equal(50, descending.GetProperty("items")[0].GetProperty("durationMinutes").GetInt32());
    }

    [Fact]
    public async Task EqualSortValuesHaveStableOrderingAcrossPages()
    {
        SeedHistory();
        await Login("owner@test.com");
        var ids = new List<int>();
        for (var page = 1; page <= 3; page++)
        {
            var result = await client.GetFromJsonAsync<JsonElement>($"/api/trainings?sortBy=calories&pageSize=2&page={page}");
            ids.AddRange(result.GetProperty("items").EnumerateArray().Select(t => t.GetProperty("id").GetInt32()));
        }
        Assert.Equal(5, ids.Distinct().Count());
        Assert.Equal(ids.OrderBy(id => id), ids);
        var empty = await client.GetFromJsonAsync<JsonElement>("/api/trainings?from=2027-01-01");
        Assert.Equal(0, empty.GetProperty("totalCount").GetInt32());
        Assert.Equal(0, empty.GetProperty("totalPages").GetInt32());
        Assert.Empty(empty.GetProperty("items").EnumerateArray());
    }

    [Theory]
    [InlineData("page=0")]
    [InlineData("pageSize=101")]
    [InlineData("pageSize=0")]
    [InlineData("sortBy=passwordHash")]
    [InlineData("sortDirection=random")]
    [InlineData("exerciseType=99")]
    [InlineData("from=not-a-date")]
    [InlineData("from=2026-02-01&to=2026-01-01")]
    public async Task InvalidHistoryQueryReturnsProblemDetails(string query)
    {
        await Login("owner@test.com");
        await AssertProblem(await client.GetAsync($"/api/trainings?{query}"), HttpStatusCode.BadRequest);
    }
}
