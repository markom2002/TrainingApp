using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;
namespace BE.Tests;
public partial class ApiIntegrationTests
{
    [Fact]
    public async Task MixedWeightUnitsAndOriginalSetValuesSurviveSaveReadAndEdit()
    {
        await Login("owner@test.com");
        var payload=WorkoutWith(new object[]{
            new {exerciseId="lat-pulldown",sets=2,reps=8,weightKg=61.46m,weightUnit="lbs",weightValue=135.5m,
                setEntries=new[]{new {reps=8,weightKg=13.61m,weightValue=30m},new {reps=8,weightKg=61.46m,weightValue=135.5m}}},
            new {exerciseId="seated-row",sets=3,reps=8,weightKg=20m,weightUnit="kg",weightValue=20m}
        });
        var response=await client.PostAsJsonAsync("/api/trainings",payload);response.EnsureSuccessStatusCode();
        var id=(await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        foreach(var edit in new[]{false,true})
        {
            if(edit)(await client.PutAsJsonAsync($"/api/trainings/{id}",payload)).EnsureSuccessStatusCode();
            var saved=await client.GetFromJsonAsync<JsonElement>($"/api/trainings/{id}");
            var entries=saved.GetProperty("exercises");
            Assert.Equal("lbs",entries[0].GetProperty("weightUnit").GetString());
            Assert.Equal(135.5m,entries[0].GetProperty("weightValue").GetDecimal());
            Assert.Equal(30m,entries[0].GetProperty("setEntries")[0].GetProperty("weightValue").GetDecimal());
            Assert.Equal(13.61m,entries[0].GetProperty("setEntries")[0].GetProperty("weightKg").GetDecimal());
            Assert.Equal("kg",entries[1].GetProperty("weightUnit").GetString());
            Assert.Equal(20m,entries[1].GetProperty("weightValue").GetDecimal());
        }
    }
    [Theory]
    [InlineData("stones",30,13.61)]
    [InlineData("lbs",30,30)]
    [InlineData("kg",30,13.61)]
    public async Task WeightUnitMustMatchCanonicalWeight(string unit,decimal value,decimal kg)
    {
        await Login("owner@test.com");
        var response=await client.PostAsJsonAsync("/api/trainings",WorkoutWith(new[]{new {exerciseId="lat-pulldown",sets=3,reps=8,weightKg=kg,weightValue=value,weightUnit=unit}}));
        Assert.Equal(HttpStatusCode.BadRequest,response.StatusCode);
    }
}
