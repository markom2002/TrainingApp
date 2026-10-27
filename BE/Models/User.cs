namespace BE.Models
{
    public class User
    {

        public int Id { get; set; }
        [System.ComponentModel.DataAnnotations.MaxLength(60)]
        public string DisplayName { get; set; } = string.Empty;
        [System.ComponentModel.DataAnnotations.MaxLength(280)]
        public string Bio { get; set; } = string.Empty;
        [System.ComponentModel.DataAnnotations.MaxLength(30)]
        public string Goal { get; set; } = "Stay consistent";
        [System.ComponentModel.DataAnnotations.MaxLength(20)]
        public string Experience { get; set; } = "Beginner";
        public int WeeklyGoal { get; set; } = 3;
        public string Role { get; set; } = Roles.User;

        public string Email { get; set; } = string.Empty;
        [System.Text.Json.Serialization.JsonIgnore]
        public string PasswordHash { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [System.Text.Json.Serialization.JsonIgnore]
        public List<Training> Trainings { get; set; } = new();

    }
}
