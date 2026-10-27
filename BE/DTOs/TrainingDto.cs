using BE.DTOs;
using System.ComponentModel.DataAnnotations;
using BE.Models;

public class TrainingDto : IValidatableObject
{
    [Required, EnumDataType(typeof(ExerciseType))]
    public ExerciseType? ExerciseType { get; set; }

    [Range(1, 1440)]
    public int DurationMinutes { get; set; }

    [Range(0, 10000)]
    public int Calories { get; set; }

    [Range(1, 10)]
    public int Intensity { get; set; }

    [Range(1, 10)]
    public int Fatigue { get; set; }

    [StringLength(2000)]
    public string? Notes { get; set; }

    [Required]
    public DateTime? TrainingDate { get; set; }
    [Required, RegularExpression("^(Unisex|Men|Women)$")]
    public string TrainingVariant { get; set; } = "Unisex";
    [Required, MaxLength(40)]
    public List<TrainingExerciseDto> Exercises { get; set; } = new();
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (Exercises != null && Exercises.Any(e => e == null))
            yield return new ValidationResult("Exercise entries cannot be null.", new[] { nameof(Exercises) });
        else if (Exercises != null && Exercises.Select(e => e.ExerciseId).Distinct().Count() != Exercises.Count)
            yield return new ValidationResult("An exercise can appear only once in a workout.", new[] { nameof(Exercises) });
    }}
