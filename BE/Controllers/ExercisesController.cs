using BE.Exercises;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace BE.Controllers;
[ApiController, Route("api/exercises"), Authorize]
public class ExercisesController : ControllerBase
{
    /// <summary>List exercises for all body areas. The catalog is available in every training variant.</summary>
    [HttpGet, ProducesResponseType(typeof(IEnumerable<ExerciseDefinition>), 200)]
    public IActionResult Get() => Ok(ExerciseCatalog.All);
}
