using BE.Data;
using BE.Models;

namespace BE.Services.Implementations;

public static class DemoSessionService
{
    public static async Task<User> CreateAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        var user = new User
        {
            Email = $"demo-{Guid.NewGuid():N}@example.invalid",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
            Gender = "Other", DisplayName = "Demo Athlete", Experience = "Intermediate",
            Goal = "Build strength", WeeklyGoal = 3
        };
        // Every visitor gets a separate account and synthetic records, never a shared login.
        for (var index = 0; index < 8; index++)
        {
            var pounds = index % 2 == 0;
            var weight = 20m + index * 2.5m;
            user.Trainings.Add(new Training
            {
                ExerciseType = ExerciseType.Strength, DurationMinutes = 40 + index * 2,
                Calories = 0, Intensity = 6 + index % 3, Fatigue = 4,
                TrainingDate = DateTime.UtcNow.Date.AddDays(-index * 3).AddHours(10),
                Notes = "Sample workout for the portfolio demo.",
                Exercises = new List<TrainingExercise>
                {
                    new()
                    {
                        ExerciseId = "lat-pulldown", Position = 0, Sets = 3, Reps = 10,
                        WeightUnit = pounds ? "lbs" : "kg", WeightValue = pounds ? 60m : weight,
                        WeightKg = pounds ? 27.22m : weight
                    },
                    new()
                    {
                        ExerciseId = "seated-cable-row", Position = 1, Sets = 3, Reps = 12,
                        WeightUnit = "kg", WeightValue = weight, WeightKg = weight
                    }
                }
            });
        }
        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);
        return user;
    }
}
