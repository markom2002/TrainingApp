using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BE.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
namespace BE.Tests;
public partial class ApiIntegrationTests
{
    private static object WorkoutWith(object? exercises,string variant="Unisex") => new { exerciseType="Strength", durationMinutes=45, calories=250, intensity=7, fatigue=5, trainingDate=new DateTime(2026,10,27,18,0,0), trainingVariant=variant, exercises };
    private static object RepsEntry(string id="bench-press",int sets=3,int reps=10,decimal weight=40) => new { exerciseId=id, sets, reps, weightKg=weight };
    [Fact]
    public async Task CatalogRequiresLoginAndCoversEveryBodyArea()
    {
        Assert.Equal(HttpStatusCode.Unauthorized,(await client.GetAsync("/api/exercises")).StatusCode);
        await Login("owner@test.com");
        var catalog=await client.GetFromJsonAsync<JsonElement>("/api/exercises");
        Assert.True(catalog.GetArrayLength()>=40);
        var groups=catalog.EnumerateArray().Select(e=>e.GetProperty("muscleGroup").GetString()).ToHashSet();
        foreach(var group in new[]{"Chest","Back","Shoulders","Biceps","Triceps","Forearms","Quads","Hamstrings","Glutes","Calves","Core","Full body","Cardio","Mobility"}) Assert.Contains(group,groups);
    }
    [Theory]
    [InlineData("Men")]
    [InlineData("Women")]
    public async Task ExerciseRecordsPersistForBothVersionsAndCanBeEdited(string variant)
    {
        await Login("owner@test.com");
        var created=await client.PostAsJsonAsync("/api/trainings",WorkoutWith(new object[]{RepsEntry(),new {exerciseId="plank",sets=2,durationSeconds=45,weightKg=0}},variant));
        Assert.Equal(HttpStatusCode.OK,created.StatusCode);
        var body=await created.Content.ReadFromJsonAsync<JsonElement>();var id=body.GetProperty("id").GetInt32();
        var stored=await client.GetFromJsonAsync<JsonElement>($"/api/trainings/{id}");
        Assert.Equal(variant,stored.GetProperty("trainingVariant").GetString());
        Assert.Equal(2,stored.GetProperty("exercises").GetArrayLength());
        Assert.Equal("bench-press",stored.GetProperty("exercises")[0].GetProperty("exerciseId").GetString());
        Assert.Equal(45,stored.GetProperty("exercises")[1].GetProperty("durationSeconds").GetInt32());
        var updated=await client.PutAsJsonAsync($"/api/trainings/{id}",WorkoutWith(new object[]{RepsEntry(sets:4,weight:42.5m),RepsEntry("goblet-squat",reps:12)},variant));
        Assert.Equal(HttpStatusCode.OK,updated.StatusCode);
        var changed=await client.GetFromJsonAsync<JsonElement>($"/api/trainings/{id}");
        Assert.Equal(4,changed.GetProperty("exercises")[0].GetProperty("sets").GetInt32());
        Assert.Equal(42.5m,changed.GetProperty("exercises")[0].GetProperty("weightKg").GetDecimal());
        using(var scope=factory.Services.CreateScope())
        {
            var db=scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Equal(2,await db.Set<BE.Models.TrainingExercise>().CountAsync(e=>e.TrainingId==id));
        }
        await Login("other@test.com");
        Assert.Equal(HttpStatusCode.NotFound,(await client.GetAsync($"/api/trainings/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,(await client.PutAsJsonAsync($"/api/trainings/{id}",WorkoutWith(Array.Empty<object>()))).StatusCode);
        await Login("owner@test.com");
        Assert.Equal(HttpStatusCode.NoContent,(await client.DeleteAsync($"/api/trainings/{id}")).StatusCode);
        using(var scope=factory.Services.CreateScope()) Assert.Equal(0,await scope.ServiceProvider.GetRequiredService<AppDbContext>().Set<BE.Models.TrainingExercise>().CountAsync(e=>e.TrainingId==id));
    }
    [Theory]
    [InlineData("unknown")]
    [InlineData("duplicate")]
    [InlineData("sets")]
    [InlineData("reps")]
    [InlineData("timed")]
    [InlineData("weight")]
    [InlineData("precision")]
    [InlineData("null-item")]
    [InlineData("null-list")]
    [InlineData("too-many")]
    [InlineData("variant")]
    public async Task InvalidExerciseDetailsAreRejected(string kind)
    {
        await Login("owner@test.com");
        object? exercises=kind switch
        {
            "unknown"=>new[]{RepsEntry("invented-exercise")},
            "duplicate"=>new[]{RepsEntry(),RepsEntry()},
            "sets"=>new[]{RepsEntry(sets:0)},
            "reps"=>new[]{RepsEntry(reps:201)},
            "timed"=>new[]{RepsEntry("plank")},
            "weight"=>new[]{RepsEntry(weight:-1)},
            "precision"=>new[]{RepsEntry(weight:12.345m)},
            "null-item"=>new object?[]{null},
            "null-list"=>null,
            "too-many"=>Enumerable.Range(0,41).Select(_=>RepsEntry()).ToArray(),
            _=>new[]{RepsEntry()}
        };
        await AssertProblem(await client.PostAsJsonAsync("/api/trainings",WorkoutWith(exercises,kind=="variant"?"Invalid":"Unisex")),HttpStatusCode.BadRequest);
    }
    [Fact]
    public async Task LegacySummaryWorkoutsStillWorkWithoutExerciseDetails()
    {
        await Login("owner@test.com");
        var created=await client.PostAsJsonAsync("/api/trainings",new {exerciseType="Cardio",durationMinutes=20,calories=100,intensity=4,fatigue=3,trainingDate=DateTime.UtcNow});
        Assert.Equal(HttpStatusCode.OK,created.StatusCode);
        var body=await created.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Empty(body.GetProperty("exercises").EnumerateArray());
        Assert.Equal("Unisex",body.GetProperty("trainingVariant").GetString());
    }
}
