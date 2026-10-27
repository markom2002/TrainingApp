using System.Security.Claims;
using BE.Data;
using BE.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BE.Controllers;

[ApiController, Route("api/profile"), Authorize]
public class ProfileController(AppDbContext context) : ControllerBase
{
    /// <summary>Read your profile, lifetime totals and progress towards this week's goal.</summary>
    /// <remarks>The week starts Monday at 00:00 UTC. No other user's profile can be requested.</remarks>
    [HttpGet, ProducesResponseType(typeof(ProfileResponse), 200)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var id = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await context.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user == null) return Problem(statusCode: 404, title: "Account not found");
        var own = context.Trainings.AsNoTracking().Where(t => t.UserId == id);
        var today = DateTime.UtcNow.Date;
        var start = today.AddDays(-((int)today.DayOfWeek + 6) % 7);
        var end = start.AddDays(7);
        var totals = await own.GroupBy(t => 1).Select(g => new
        {
            Count = g.Count(), Minutes = g.Sum(t => t.DurationMinutes), Calories = g.Sum(t => t.Calories),
            Weekly = g.Count(t => t.TrainingDate >= start && t.TrainingDate < end)
        }).SingleOrDefaultAsync(cancellationToken);
        return Ok(new ProfileResponse(string.IsNullOrWhiteSpace(user.DisplayName) ? user.Email.Split('@')[0] : user.DisplayName,
            user.Email, user.Gender, user.Role, user.Bio, user.Goal, user.Experience, user.WeeklyGoal, user.CreatedAt, totals?.Count ?? 0, totals?.Minutes ?? 0, totals?.Calories ?? 0, totals?.Weekly ?? 0));
    }

    /// <summary>Update your display name, bio, training goal and experience.</summary>
    /// <remarks>Email, identity, password and role cannot be changed through this endpoint.</remarks>
    [HttpPut, ProducesResponseType(204), ProducesResponseType(typeof(ValidationProblemDetails), 400)]
    public async Task<IActionResult> Update(UpdateProfileDto dto, CancellationToken cancellationToken)
    {
        var id = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await context.Users.SingleOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user == null) return Problem(statusCode: 404, title: "Account not found");
        user.DisplayName = dto.DisplayName.Trim();
        user.Bio = dto.Bio?.Trim() ?? string.Empty;
        user.Goal = dto.Goal;
        user.Experience = dto.Experience;
        user.WeeklyGoal = dto.WeeklyGoal;
        await context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
