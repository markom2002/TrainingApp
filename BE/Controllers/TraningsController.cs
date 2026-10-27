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

        /// <summary>Add a workout owned by the signed-in user.</summary>
        [ProducesResponseType(typeof(BE.Models.Training), 200)]
        [ProducesResponseType(typeof(ValidationProblemDetails), 400)]
        [HttpPost]
        public IActionResult AddTraining(TrainingDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = GetUserId();

            var result = _trainingService.Add(userId, dto);

            return Ok(result);
        }

        /// <summary>List your workouts with pagination, filters and sorting.</summary>
        /// <remarks>Defaults: page=1, pageSize=10, sortBy=trainingDate, sortDirection=desc. Date filters include both endpoints. Maximum pageSize is 100.</remarks>
        [ProducesResponseType(typeof(PagedResult<BE.Models.Training>), 200)]
        [ProducesResponseType(typeof(ValidationProblemDetails), 400)]
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] TrainingQuery query, CancellationToken cancellationToken)
        {
            var userId = GetUserId();

            var trainings = await _trainingService.GetAll(userId, query, cancellationToken);

            return Ok(trainings);
        }

        /// <summary>Get your workout by ID.</summary>
        /// <remarks>Unknown IDs and workouts belonging to another user return 404.</remarks>
        [ProducesResponseType(typeof(BE.Models.Training), 200)]
        [ProducesResponseType(typeof(ProblemDetails), 404)]
        [ProducesResponseType(typeof(ValidationProblemDetails), 400)]
        [HttpGet("{id}")]
        public IActionResult GetById(int id)
        {
            var userId = GetUserId();

            var training = _trainingService.GetById(id, userId);

            if (training == null)
                return Problem(statusCode: 404, title: "Training not found");

            return Ok(training);
        }

        /// <summary>Update your workout.</summary>
        /// <remarks>Unknown IDs and workouts belonging to another user return 404.</remarks>
        [ProducesResponseType(typeof(BE.Models.Training), 200)]
        [ProducesResponseType(typeof(ProblemDetails), 404)]
        [ProducesResponseType(typeof(ValidationProblemDetails), 400)]
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

        /// <summary>Delete your workout.</summary>
        /// <remarks>Unknown IDs and workouts belonging to another user return 404.</remarks>
        [ProducesResponseType(204)]
        [ProducesResponseType(typeof(ProblemDetails), 404)]
        [HttpDelete("{id}")]
        public IActionResult DeleteTraining(int id)
        {
            var userId = GetUserId();

            var deleted = _trainingService.Delete(id, userId);

            if (!deleted)
                return Problem(statusCode: 404, title: "Training not found");

            return NoContent();
        }

        /// <summary>Get weekly totals and average intensity/fatigue for a calendar month.</summary>
        /// <remarks>Week 1 contains days 1-7, week 2 days 8-14, and so on. Returns only the caller's data.</remarks>
        [ProducesResponseType(typeof(IEnumerable<MonthlyTrainingStats>), 200)]
        [ProducesResponseType(typeof(ValidationProblemDetails), 400)]
        [HttpGet("month")]
        public IActionResult GetMonthlyStats([System.ComponentModel.DataAnnotations.Range(1, 9999)] int year, [System.ComponentModel.DataAnnotations.Range(1, 12)] int month)
        {
            var userId = GetUserId();

            var stats = _trainingService.GetMonthlyStats(userId, year, month);

            return Ok(stats);
        }
        /// <summary>Get your monthly dashboard totals, weekly activity and exercise mix.</summary>
        /// <remarks>Compares workout count with the previous calendar month. Change is null when the previous month has no workouts.</remarks>
        [HttpGet("overview")]
        [ProducesResponseType(typeof(DashboardOverview), 200)]
        [ProducesResponseType(typeof(ValidationProblemDetails), 400)]
        public async Task<IActionResult> GetOverview(
            [System.ComponentModel.DataAnnotations.Range(2, 9998)] int year,
            [System.ComponentModel.DataAnnotations.Range(1, 12)] int month, CancellationToken cancellationToken)
            => Ok(await _trainingService.GetOverview(GetUserId(), year, month, cancellationToken));
    }
}
