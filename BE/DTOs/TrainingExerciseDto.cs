using System.ComponentModel.DataAnnotations;
using BE.Exercises;

namespace BE.DTOs;
public class TrainingExerciseDto : IValidatableObject
{
    [Required, StringLength(60)] public string ExerciseId { get; set; } = string.Empty;
    [Range(1, 30)] public int Sets { get; set; } = 3;
    [Range(1, 200)] public int? Reps { get; set; }
    [Range(1, 7200)] public int? DurationSeconds { get; set; }
    [Range(typeof(decimal), "0", "1000")] public decimal WeightKg { get; set; }
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        var exercise = ExerciseCatalog.Find(ExerciseId);
        if (exercise == null) yield return new ValidationResult("Choose an exercise from the catalog.", new[] { nameof(ExerciseId) });
        else if (exercise.Timed && (DurationSeconds == null || Reps != null))
            yield return new ValidationResult("Timed exercises require seconds and no repetitions.", new[] { nameof(DurationSeconds) });
        else if (!exercise.Timed && (Reps == null || DurationSeconds != null))
            yield return new ValidationResult("This exercise requires repetitions and no duration.", new[] { nameof(Reps) });
        if (decimal.Round(WeightKg, 2) != WeightKg)
            yield return new ValidationResult("Weight accepts at most two decimal places.", new[] { nameof(WeightKg) });
    }
}
