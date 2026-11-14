using System.Security.Claims;
using BE.Data;
using BE.DTOs;
using BE.Models;
using BE.Services.Implementations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace BE.Controllers;

[ApiController, Authorize, Route("api/journey")]
public class JourneyController(AppDbContext db, JourneyService journey) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>Read your streak, XP, achievements, weight history and personal records.</summary>
    /// <remarks>UTC calendar days; one streak point per workout day; up to two intervening rest days. Future workouts are excluded. Milestones and XP are recalculated from saved records after edits or deletions.</remarks>
    [HttpGet, ProducesResponseType(typeof(JourneyOverview), 200)]
    public async Task<IActionResult> Get(CancellationToken ct) => Ok(await journey.Get(UserId, DateTime.UtcNow, ct));

    /// <summary>Save or correct your weigh-in for one UTC date.</summary>
    [HttpPut("measurements"), ProducesResponseType(204)]
    public async Task<IActionResult> WeighIn(MeasurementDto dto, CancellationToken ct)
    {
        var date = dto.MeasuredOn!.Value.ToDateTime(TimeOnly.MinValue);
        var measurement = await db.BodyMeasurements.SingleOrDefaultAsync(m => m.UserId == UserId && m.MeasuredOn == date, ct);
        if (measurement == null) db.BodyMeasurements.Add(new BodyMeasurement { UserId = UserId, MeasuredOn = date, WeightKg = dto.WeightKg });
        else measurement.WeightKg = dto.WeightKg;
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException) { return Problem(statusCode:409, title:"A weigh-in changed at the same time. Reload and try again."); }
        return NoContent();
    }

    [HttpDelete("measurements/{id:int}"), ProducesResponseType(204), ProducesResponseType(404)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var measurement = await db.BodyMeasurements.SingleOrDefaultAsync(m => m.Id == id && m.UserId == UserId, ct);
        if (measurement == null) return NotFound();
        db.Remove(measurement);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPut("body-goal"), ProducesResponseType(204)]
    public async Task<IActionResult> Goal(BodyGoalDto dto, CancellationToken ct)
    {
        var user = await db.Users.SingleAsync(u => u.Id == UserId, ct);
        user.BodyGoal = dto.Goal;
        user.StartingWeightKg = dto.StartingWeightKg;
        user.TargetWeightKg = dto.TargetWeightKg;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet("calendar")]
    public async Task<IActionResult> Calendar([FromQuery] int year, [FromQuery] int month, CancellationToken ct)
    {
        if(year<2 || year>9998 || month<1 || month>12) return Problem(statusCode:400,title:"Choose a valid month.");
        var start=new DateTime(year,month,1);var end=start.AddMonths(1);
        var items=await db.Trainings.AsNoTracking().Where(t=>t.UserId==UserId && t.TrainingDate>=start && t.TrainingDate<end).OrderBy(t=>t.TrainingDate).ThenBy(t=>t.Id).Include(t=>t.Exercises.OrderBy(e=>e.Position)).ThenInclude(e=>e.SetEntries.OrderBy(s=>s.Position)).AsSplitQuery().ToListAsync(ct);
        foreach(var item in items)item.TrainingDate=DateTime.SpecifyKind(item.TrainingDate,DateTimeKind.Utc);
        return Ok(items);
    }
}
