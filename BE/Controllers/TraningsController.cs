using Microsoft.AspNetCore.Mvc;
using BE.DTOs;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using BE.Services.Interfaces;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/trainings")]
    [Authorize]
    public class TrainingsController : ControllerBase
    {
        private readonly ITrainingService _trainingService;

        public TrainingsController(ITrainingService trainingService)
        {
            _trainingService = trainingService;
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null)
                throw new UnauthorizedAccessException();

            return int.Parse(userIdClaim);
        }

        [HttpPost]
        public IActionResult AddTraining(TrainingDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = GetUserId();

            var result = _trainingService.Add(userId, dto);

            return Ok(result);
        }

        [HttpGet]
        public IActionResult GetAll()
        {
            var userId = GetUserId();

            var trainings = _trainingService.GetAll(userId);

            return Ok(trainings);
        }

        [HttpGet("{id}")]
        public IActionResult GetById(int id)
        {
            var userId = GetUserId();

            var training = _trainingService.GetById(id, userId);

            if (training == null)
                return NotFound("Training not found");

            return Ok(training);
        }

        [HttpPut("{id}")]
        public IActionResult UpdateTraining(int id, TrainingDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = GetUserId();

            var updated = _trainingService.Update(id, userId, dto);

            if (updated == null)
                return NotFound("Training not found");

            return Ok(updated);
        }

        [HttpDelete("{id}")]
        public IActionResult DeleteTraining(int id)
        {
            var userId = GetUserId();

            var deleted = _trainingService.Delete(id, userId);

            if (!deleted)
                return NotFound("Training not found");

            return NoContent();
        }

        [HttpGet("month")]
        public IActionResult GetMonthlyStats(int year, int month)
        {
            var userId = GetUserId();

            var stats = _trainingService.GetMonthlyStats(userId, year, month);

            return Ok(stats);
        }
    }
}
