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
    [RegularExpression("^(kg|lbs)$")] public string? WeightUnit { get; set; }
    [Range(typeof(decimal), "0", "2204.62")] public decimal? WeightValue { get; set; }
    [MaxLength(30)] public List<TrainingSetDto> SetEntries { get; set; } = new();
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (!ValidEnteredWeight(WeightValue, WeightKg, WeightUnit) ||
            (SetEntries != null && SetEntries.Any(s => s != null && !ValidEnteredWeight(s.WeightValue, s.WeightKg, WeightUnit))))
            yield return new ValidationResult("Entered weight must match its unit and kilogram value.", new[] { nameof(WeightValue) });
        var exercise = ExerciseCatalog.Find(ExerciseId);
        if (exercise == null) yield return new ValidationResult("Choose an exercise from the catalog.", new[] { nameof(ExerciseId) });
        else if (exercise.Timed && (DurationSeconds == null || Reps != null))
            yield return new ValidationResult("Timed exercises require seconds and no repetitions.", new[] { nameof(DurationSeconds) });
        else if (!exercise.Timed && (Reps == null || DurationSeconds != null))
            yield return new ValidationResult("This exercise requires repetitions and no duration.", new[] { nameof(Reps) });
        if (decimal.Round(WeightKg, 2) != WeightKg)
            yield return new ValidationResult("Weight accepts at most two decimal places.", new[] { nameof(WeightKg) });
        if (SetEntries == null || SetEntries.Any(s => s == null))
            yield return new ValidationResult("Set entries cannot be null.", new[] { nameof(SetEntries) });
        else if (SetEntries.Count > 0)
        {
            if (Sets != SetEntries.Count)
                yield return new ValidationResult("Set count must match the individual sets.", new[] { nameof(Sets) });
            if (exercise != null && SetEntries.Any(s => exercise.Timed
                ? s.DurationSeconds == null || s.Reps != null
                : s.Reps == null || s.DurationSeconds != null))
                yield return new ValidationResult("Each set requires repetitions or seconds matching the exercise.", new[] { nameof(SetEntries) });
        }
    }
    private static bool ValidEnteredWeight(decimal? value, decimal kg, string? unit) =>
        value == null || (unit is "kg" or "lbs" && decimal.Round(value.Value, 2) == value &&
            decimal.Round(unit == "lbs" ? value.Value * 0.45359237m : value.Value, 2, MidpointRounding.AwayFromZero) == kg);
}

public class TrainingSetDto : IValidatableObject
{
    [Range(typeof(decimal), "0", "2204.62")] public decimal? WeightValue { get; set; }
    [Range(1, 200)] public int? Reps { get; set; }
    [Range(1, 7200)] public int? DurationSeconds { get; set; }
    [Range(typeof(decimal), "0", "1000")] public decimal WeightKg { get; set; }
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (decimal.Round(WeightKg, 2) != WeightKg)
            yield return new ValidationResult("Weight accepts at most two decimal places.", new[] { nameof(WeightKg) });
    }
}
