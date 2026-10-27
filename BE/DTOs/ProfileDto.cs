using System.ComponentModel.DataAnnotations;

namespace BE.DTOs;

public class UpdateProfileDto
{
    [Required, StringLength(60)] public string DisplayName { get; set; } = string.Empty;
    [StringLength(280)] public string Bio { get; set; } = string.Empty;
    [Required, RegularExpression("^(Stay consistent|Build strength|Improve endurance|Improve mobility)$")]
    public string Goal { get; set; } = "Stay consistent";
    [Required, RegularExpression("^(Beginner|Intermediate|Advanced)$")]
    public string Experience { get; set; } = "Beginner";
    [Range(1, 7)] public int WeeklyGoal { get; set; } = 3;
}
public record ProfileResponse(string DisplayName, string Email, string Gender, string Role, string Bio,
    string Goal, string Experience, int WeeklyGoal, DateTime MemberSince, int TotalWorkouts,
    int TotalMinutes, int TotalCalories, int WeeklyWorkouts);
