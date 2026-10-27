using BE.DTOs;
using BE.Data;
using BE.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BE.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = Roles.Admin)]
public class AdminController(AppDbContext context) : ControllerBase
{
    /// <summary>Returns aggregate application statistics for administrators.</summary>
    [ProducesResponseType(typeof(AdminSummaryResponse), 200)]
    [HttpGet("summary")]
    public async Task<IActionResult> Summary() => Ok(new AdminSummaryResponse(
        await context.Users.CountAsync(), await context.Trainings.CountAsync()));
}
