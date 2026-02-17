namespace BE.Models
{
    public class Training
    {
        public int Id { get; set; }

        public int UserId { get; set; }

        public ExerciseType ExerciseType { get; set; }
        public int DurationMinutes { get; set; }
        public int Calories { get; set; }

        public int Intensity { get; set; } // 1–10
        public int Fatigue { get; set; }   // 1–10

        public string? Notes { get; set; }
        public DateTime TrainingDate { get; set; }

        public User User { get; set; }


    }
}
