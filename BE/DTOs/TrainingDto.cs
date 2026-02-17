using System.ComponentModel.DataAnnotations;
using BE.Models;

public class TrainingDto
{
    [Required]
    public ExerciseType ExerciseType { get; set; }

    [Range(1, 1440)]
    public int DurationMinutes { get; set; }

    [Range(0, 10000)]
    public int Calories { get; set; }

    [Range(1, 10)]
    public int Intensity { get; set; }

    [Range(1, 10)]
    public int Fatigue { get; set; }

    public string? Notes { get; set; }

    [Required]
    public DateTime TrainingDate { get; set; }
}

