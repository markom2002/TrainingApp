using Microsoft.AspNetCore.Mvc;
using BE.Data;
using BE.DTOs;
using BE.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;



namespace BE.Controllers
{
    
    [ApiController]
    [Route("api/trainings")]

    [Authorize]
    public class TrainingsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TrainingsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public IActionResult AddTraining(TrainingDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);


            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var training = new Training
            {
                UserId = userId,
                ExerciseType = dto.ExerciseType,
                DurationMinutes = dto.DurationMinutes,
                Calories = dto.Calories,
                Intensity = dto.Intensity,
                Fatigue = dto.Fatigue,
                Notes = dto.Notes,
                TrainingDate = dto.TrainingDate
            };

            _context.Trainings.Add(training);
            _context.SaveChanges();

            return Ok(training);
        }

        [HttpGet("month")]
        public IActionResult GetMonthlyStats(int year, int month)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var trainings = _context.Trainings
                .Where(t => t.UserId == userId
                            && t.TrainingDate.Year == year
                            && t.TrainingDate.Month == month)
                .ToList();

            var weeklyStats = trainings
                .GroupBy(t => (t.TrainingDate.Day - 1) / 7 + 1)
                .Select(g => new
                {
                    Week = g.Key,
                    TotalDuration = g.Sum(x => x.DurationMinutes),
                    Count = g.Count(),
                    AvgIntensity = Math.Round(g.Average(x => x.Intensity), 2),
                    AvgFatigue = Math.Round(g.Average(x => x.Fatigue), 2)
                })
                .OrderBy(x => x.Week)
                .ToList();

            return Ok(weeklyStats);
        }


        [HttpGet("{id}")]
        public IActionResult GetById(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var training = _context.Trainings
                .FirstOrDefault(t => t.Id == id && t.UserId == userId);

            if (training == null)
                return NotFound();

            return Ok(training);
        }





        [HttpDelete("{id}")]
        public IActionResult DeleteTraining(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var training = _context.Trainings
                .FirstOrDefault(t => t.Id == id && t.UserId == userId);

            if (training == null)
                return NotFound("Training not found");

            _context.Trainings.Remove(training);
            _context.SaveChanges();

            return NoContent();
        }

        [HttpPut("{id}")]
        public IActionResult UpdateTraining(int id, TrainingDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (userIdClaim == null)
                return Unauthorized();

            var userId = int.Parse(userIdClaim);

            var training = _context.Trainings
                .FirstOrDefault(t => t.Id == id && t.UserId == userId);

            if (training == null)
                return NotFound("Training not found");

            training.ExerciseType = dto.ExerciseType;
            training.DurationMinutes = dto.DurationMinutes;
            training.Calories = dto.Calories;
            training.Intensity = dto.Intensity;
            training.Fatigue = dto.Fatigue;
            training.Notes = dto.Notes ?? "";
            training.TrainingDate = dto.TrainingDate;

            _context.SaveChanges();

            return Ok(training);
        }



        [HttpGet]
        public IActionResult GetAll()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var trainings = _context.Trainings
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.TrainingDate)
                .ToList();

            return Ok(trainings);
        }


        

    }

}
