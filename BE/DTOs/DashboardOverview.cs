namespace BE.DTOs;

public record DashboardOverview(
    int Year, int Month, int Workouts, int Minutes, int Calories,
    double AverageIntensity, double AverageFatigue, int PreviousWorkouts,
    double? WorkoutChangePercent, IReadOnlyList<WeeklyActivity> WeeklyActivity,
    IReadOnlyList<ExerciseBreakdown> ExerciseBreakdown);
public record WeeklyActivity(int Week, int Workouts, int Minutes);
public record ExerciseBreakdown(BE.Models.ExerciseType ExerciseType, int Workouts, int Minutes);
