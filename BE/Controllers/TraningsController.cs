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
        public async Task<IActionResult> GetAll([FromQuery] TrainingQuery query, CancellationToken cancellationToken)
        {
            var userId = GetUserId();

            var trainings = await _trainingService.GetAll(userId, query, cancellationToken);

            return Ok(trainings);
        }

        [HttpGet("{id}")]
        public IActionResult GetById(int id)
        {
            var userId = GetUserId();

            var training = _trainingService.GetById(id, userId);

            if (training == null)
                return Problem(statusCode: 404, title: "Training not found");

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
                return Problem(statusCode: 404, title: "Training not found");

            return Ok(updated);
        }

        [HttpDelete("{id}")]
        public IActionResult DeleteTraining(int id)
        {
            var userId = GetUserId();

            var deleted = _trainingService.Delete(id, userId);

            if (!deleted)
                return Problem(statusCode: 404, title: "Training not found");

            return NoContent();
        }

        [HttpGet("month")]
        public IActionResult GetMonthlyStats([System.ComponentModel.DataAnnotations.Range(1, 9999)] int year, [System.ComponentModel.DataAnnotations.Range(1, 12)] int month)
        {
            var userId = GetUserId();

            var stats = _trainingService.GetMonthlyStats(userId, year, month);

            return Ok(stats);
        }
    }
}
