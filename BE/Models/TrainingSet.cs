using System.Text.Json.Serialization;
namespace BE.Models;

public class TrainingSet
{
    public int Id { get; set; }
    public int TrainingExerciseId { get; set; }
    [JsonIgnore] public TrainingExercise TrainingExercise { get; set; } = null!;
    public int Position { get; set; }
    public int? Reps { get; set; }
    public int? DurationSeconds { get; set; }
    public decimal WeightKg { get; set; }
    public decimal? WeightValue { get; set; }
}
