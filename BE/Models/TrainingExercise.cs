using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace BE.Models;
public class TrainingExercise
{
    public int Id { get; set; }
    public int TrainingId { get; set; }
    [JsonIgnore] public Training Training { get; set; } = null!;
    [MaxLength(60)] public string ExerciseId { get; set; } = string.Empty;
    public int Position { get; set; }
    public int Sets { get; set; }
    public int? Reps { get; set; }
    public int? DurationSeconds { get; set; }
    public decimal WeightKg { get; set; }
}
