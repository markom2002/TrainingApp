using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BE.Data;
using BE.Models;
using BE.Services.Implementations;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
namespace BE.Tests;

public class StreakTests
{
    private readonly DateTime today = new(2026, 11, 13);
    [Fact] public void StreakAllowsRecoveryDeduplicatesDaysAndExcludesFutureDates()
    {
        var result = JourneyService.CalculateStreak(new[] { today.AddDays(-6), today.AddDays(-3), today, today, today.AddDays(1) }, today);
        Assert.Equal((3, 3), result);
    }
    [Fact] public void StreakExpiresAfterThreeFullDaysWithoutTrainingButKeepsBest()
    {
        Assert.Equal((0, 2), JourneyService.CalculateStreak(new[] { today.AddDays(-7), today.AddDays(-4) }, today));
        Assert.Equal((2, 2), JourneyService.CalculateStreak(new[] { today.AddDays(-6), today.AddDays(-3) }, today));
    }
    [Fact] public void StreakRestartsAfterLongGap()
    {
        Assert.Equal((1, 3), JourneyService.CalculateStreak(new[] { today.AddDays(-10), today.AddDays(-9), today.AddDays(-8), today }, today));
        Assert.Equal((0, 0), JourneyService.CalculateStreak(Array.Empty<DateTime>(), today));
    }
}

public partial class ApiIntegrationTests
{
    [Fact] public async Task JourneyRequiresAuthenticationAndDoesNotMixAccounts()
    {
        Assert.Equal(HttpStatusCode.Unauthorized,(await client.GetAsync("/api/journey")).StatusCode);
        await Login("owner@test.com");
        var own = await client.GetFromJsonAsync<JsonElement>("/api/journey");
        Assert.Equal(1,own.GetProperty("totalWorkouts").GetInt32());
        Assert.Equal(1,own.GetProperty("currentStreak").GetInt32());
        Assert.Equal(140,own.GetProperty("xp").GetInt32());
        Assert.False(own.TryGetProperty("rank", out _));
        Assert.False(own.TryGetProperty("rankLadder", out _));
        Assert.False(own.TryGetProperty("xpBreakdown", out _));
        Assert.NotEmpty(own.GetProperty("achievements").EnumerateArray());
        var again=await client.GetFromJsonAsync<JsonElement>("/api/journey");
        Assert.Equal(own.GetProperty("xp").GetInt32(),again.GetProperty("xp").GetInt32());
        await Login("other@test.com");
        var other=await client.GetFromJsonAsync<JsonElement>("/api/journey");
        Assert.Equal(0,other.GetProperty("totalWorkouts").GetInt32());
        Assert.Equal(0,other.GetProperty("xp").GetInt32());
        Assert.Empty(other.GetProperty("measurements").EnumerateArray());
    }

    [Fact] public async Task TenDayStreakUnlocksMilestoneAndFutureLogsDoNotCount()
    {
        using(var scope=factory.Services.CreateScope())
        {
            var db=scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var owner=db.Users.Single(u=>u.Email=="owner@test.com");
            db.Trainings.RemoveRange(db.Trainings);
            for(var i=0;i<10;i++)db.Trainings.Add(new Training{UserId=owner.Id,TrainingDate=DateTime.UtcNow.Date.AddDays(-i*2),DurationMinutes=45});
            db.Trainings.Add(new Training{UserId=owner.Id,TrainingDate=DateTime.UtcNow.Date.AddDays(1),DurationMinutes=1000});
            db.SaveChanges();
        }
        await Login("owner@test.com");
        var data=await client.GetFromJsonAsync<JsonElement>("/api/journey");
        Assert.Equal(10,data.GetProperty("currentStreak").GetInt32());
        Assert.Equal(10,data.GetProperty("totalWorkouts").GetInt32());
        Assert.True(data.GetProperty("achievements").EnumerateArray().Single(a=>a.GetProperty("id").GetString()=="unstoppable").GetProperty("unlocked").GetBoolean());
    }

    [Fact] public async Task RecordsRequirePriorDayAndAreRecalculatedAfterDeletion()
    {
        int recordId;
        using(var scope=factory.Services.CreateScope())
        {
            var db=scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var owner=db.Users.Single(u=>u.Email=="owner@test.com");
            db.Trainings.Add(new Training{UserId=owner.Id,TrainingDate=DateTime.UtcNow.Date.AddDays(-2),DurationMinutes=45,Exercises=new(){new(){ExerciseId="bench-press",Sets=3,Reps=10,WeightKg=40}}});
            var pr=new Training{UserId=owner.Id,TrainingDate=DateTime.UtcNow.Date,DurationMinutes=45,Exercises=new(){new(){ExerciseId="bench-press",Sets=3,Reps=8,WeightKg=50}}};
            db.Trainings.Add(pr);
            db.SaveChanges();recordId=pr.Id;
        }
        await Login("owner@test.com");
        var data=await client.GetFromJsonAsync<JsonElement>("/api/journey");
        var prRow=Assert.Single(data.GetProperty("personalRecords").EnumerateArray());
        Assert.Equal(50,prRow.GetProperty("weightKg").GetDecimal());
        Assert.Equal(40,prRow.GetProperty("previousKg").GetDecimal());
        Assert.Equal(HttpStatusCode.NoContent,(await client.DeleteAsync($"/api/trainings/{recordId}")).StatusCode);
        data=await client.GetFromJsonAsync<JsonElement>("/api/journey");
        Assert.Empty(data.GetProperty("personalRecords").EnumerateArray());
    }

    [Fact] public async Task WeighInsUpsertByDayRespectOwnershipAndRewardOnlySelectedDirection()
    {
        await Login("owner@test.com");
        var first=DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-5));
        var today=DateOnly.FromDateTime(DateTime.UtcNow);
        Assert.Equal(HttpStatusCode.NoContent,(await client.PutAsJsonAsync("/api/journey/measurements",new{weightKg=75,measuredOn=first})).StatusCode);
        await client.PutAsJsonAsync("/api/journey/measurements",new{weightKg=76,measuredOn=today});
        await client.PutAsJsonAsync("/api/journey/measurements",new{weightKg=77,measuredOn=today});
        var data=await client.GetFromJsonAsync<JsonElement>("/api/journey");
        Assert.Equal(2,data.GetProperty("measurements").GetArrayLength());
        Assert.EndsWith("Z",data.GetProperty("measurements")[0].GetProperty("measuredOn").GetString());
        Assert.Equal(2,data.GetProperty("weightChangeKg").GetDecimal());
        Assert.False(data.GetProperty("achievements").EnumerateArray().Single(a=>a.GetProperty("id").GetString()=="body-goal").GetProperty("unlocked").GetBoolean());
        await client.PutAsJsonAsync("/api/journey/body-goal",new{goal="Gain"});
        data=await client.GetFromJsonAsync<JsonElement>("/api/journey");
        Assert.True(data.GetProperty("achievements").EnumerateArray().Single(a=>a.GetProperty("id").GetString()=="body-goal").GetProperty("unlocked").GetBoolean());
        var id=data.GetProperty("measurements")[0].GetProperty("id").GetInt32();
        await Login("other@test.com");
        Assert.Equal(HttpStatusCode.NotFound,(await client.DeleteAsync($"/api/journey/measurements/{id}")).StatusCode);
        var other=await client.GetFromJsonAsync<JsonElement>("/api/journey");
        Assert.Empty(other.GetProperty("measurements").EnumerateArray());
        await Login("owner@test.com");
        Assert.Equal(HttpStatusCode.NoContent,(await client.DeleteAsync($"/api/journey/measurements/{id}")).StatusCode);
    }

    [Theory]
    [InlineData(0,0)] [InlineData(401,0)] [InlineData(75.123,0)] [InlineData(75,1)]
    public async Task InvalidMeasurementsAreRejected(decimal weightKg,int offset)
    {
        await Login("owner@test.com");
        await AssertProblem(await client.PutAsJsonAsync("/api/journey/measurements",new{weightKg,measuredOn=DateOnly.FromDateTime(DateTime.UtcNow.AddDays(offset))}),HttpStatusCode.BadRequest);
    }

    [Fact] public async Task IndividualSetsRoundTripAndReplaceWithoutLeavingOrphans()
    {
        await Login("owner@test.com");
        object Workout(decimal lastWeight)=>new{exerciseType=1,durationMinutes=45,calories=0,intensity=7,fatigue=5,trainingDate=DateTime.UtcNow,exercises=new[]{new{exerciseId="bench-press",sets=2,reps=10,weightKg=0,setEntries=new[]{new{reps=10,weightKg=40m},new{reps=8,weightKg=lastWeight}}}}};
        var created=await client.PostAsJsonAsync("/api/trainings",Workout(45));
        created.EnsureSuccessStatusCode();
        var saved=await created.Content.ReadFromJsonAsync<JsonElement>();
        int id=saved.GetProperty("id").GetInt32();
        var result=await client.GetFromJsonAsync<JsonElement>($"/api/trainings/{id}");
        var e=result.GetProperty("exercises")[0];
        Assert.Equal(45,e.GetProperty("weightKg").GetDecimal());
        Assert.Equal(2,e.GetProperty("setEntries").GetArrayLength());
        Assert.Equal(8,e.GetProperty("setEntries")[1].GetProperty("reps").GetInt32());
        (await client.PutAsJsonAsync($"/api/trainings/{id}",Workout(50))).EnsureSuccessStatusCode();
        using(var scope=factory.Services.CreateScope())
        {
            var db=scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Equal(2,db.Set<TrainingSet>().Count());
        }
        await client.DeleteAsync($"/api/trainings/{id}");
        using(var scope=factory.Services.CreateScope())Assert.Empty(scope.ServiceProvider.GetRequiredService<AppDbContext>().Set<TrainingSet>());
    }

    [Fact] public async Task IndividualSetValidationRejectsWrongTypeAndMismatchedCount()
    {
        await Login("owner@test.com");
        var bad=new{exerciseType=1,durationMinutes=45,calories=0,intensity=7,fatigue=5,trainingDate=DateTime.UtcNow,exercises=new[]{new{exerciseId="bench-press",sets=3,reps=10,weightKg=40,setEntries=new[]{new{durationSeconds=20,weightKg=40}}}}};
        await AssertProblem(await client.PostAsJsonAsync("/api/trainings",bad),HttpStatusCode.BadRequest);
    }

    [Fact] public async Task MultipleSessionsOnOneDateDoNotManufactureStreakOrRecords()
    {
        using(var scope=factory.Services.CreateScope())
        {
            var db=scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var owner=db.Users.Single(u=>u.Email=="owner@test.com");
            foreach(var weight in new[]{40m,50m})db.Trainings.Add(new Training{UserId=owner.Id,TrainingDate=DateTime.UtcNow.Date,DurationMinutes=45,Exercises=new(){new(){ExerciseId="bench-press",Sets=3,Reps=10,WeightKg=weight}}});
            db.SaveChanges();
        }
        await Login("owner@test.com");
        var data=await client.GetFromJsonAsync<JsonElement>("/api/journey");
        Assert.Equal(1,data.GetProperty("currentStreak").GetInt32());
        Assert.Empty(data.GetProperty("personalRecords").EnumerateArray());
        Assert.EndsWith("Z",data.GetProperty("week")[0].GetProperty("date").GetString());
    }
}
