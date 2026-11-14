using System.Net;using System.Net.Http.Json;using System.Text.Json;using Xunit;
namespace BE.Tests;
public partial class ApiIntegrationTests
{
 [Theory][InlineData("Gain",71,76,73.5,50)][InlineData("Lose",90,80,87.5,25)]
 public async Task PersonalGoalUsesChosenBaselineAndDirection(string goal,decimal start,decimal target,decimal current,decimal expected)
 {
  await Login("owner@test.com");(await client.PutAsJsonAsync("/api/journey/body-goal",new{goal,startingWeightKg=start,targetWeightKg=target})).EnsureSuccessStatusCode();
  (await client.PutAsJsonAsync("/api/journey/measurements",new{weightKg=current,measuredOn=DateOnly.FromDateTime(DateTime.UtcNow)})).EnsureSuccessStatusCode();
  var data=await client.GetFromJsonAsync<JsonElement>("/api/journey");Assert.Equal(expected,data.GetProperty("goalProgressPercent").GetDecimal());Assert.Equal(start,data.GetProperty("startingWeightKg").GetDecimal());
  Assert.True(data.GetProperty("achievements").GetArrayLength()>35);
  var id="body-"+(goal=="Gain"?"lose":"gain");Assert.DoesNotContain(data.GetProperty("achievements").EnumerateArray(),a=>a.GetProperty("id").GetString()!.StartsWith(id));
 }
 [Theory][InlineData("Gain",71,70)][InlineData("Lose",71,76)][InlineData("Gain",10,76)]
 public async Task InvalidPersonalGoalIsRejected(string goal,decimal start,decimal target){await Login("owner@test.com");await AssertProblem(await client.PutAsJsonAsync("/api/journey/body-goal",new{goal,startingWeightKg=start,targetWeightKg=target}),HttpStatusCode.BadRequest);}
 [Fact]public async Task CalendarIsPrivateAndValidatesItsMonth()
 {
  Assert.Equal(HttpStatusCode.Unauthorized,(await client.GetAsync("/api/journey/calendar?year=2026&month=11")).StatusCode);
  await Login("owner@test.com");var today=DateTime.UtcNow;var own=await client.GetFromJsonAsync<JsonElement>($"/api/journey/calendar?year={today.Year}&month={today.Month}");Assert.Single(own.EnumerateArray());
  await Login("other@test.com");var other=await client.GetFromJsonAsync<JsonElement>($"/api/journey/calendar?year={today.Year}&month={today.Month}");Assert.Empty(other.EnumerateArray());
  Assert.Equal(HttpStatusCode.BadRequest,(await client.GetAsync("/api/journey/calendar?year=2026&month=13")).StatusCode);
 }
}
