namespace BE.Models
{
    public class Training
    {
        public int Id { get; set; }

        [System.ComponentModel.DataAnnotations.MaxLength(10)]
        public string TrainingVariant { get; set; } = "Unisex";
        public List<TrainingExercise> Exercises { get; set; } = new();
        public int UserId { get; set; }

        public ExerciseType ExerciseType { get; set; }
        public int DurationMinutes { get; set; }
        public int Calories { get; set; }

        public int Intensity { get; set; } // 1-10
        public int Fatigue { get; set; } // 1-10

        public string? Notes { get; set; }
        public DateTime TrainingDate { get; set; }

        [System.Text.Json.Serialization.JsonIgnore]
        public User User { get; set; } = null!;


    }
}
