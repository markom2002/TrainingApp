using System.ComponentModel.DataAnnotations;
namespace BE.DTOs;

public class MeasurementDto : IValidatableObject
{
    [Range(typeof(decimal), "20", "400")] public decimal WeightKg { get; set; }
    [Required] public DateOnly? MeasuredOn { get; set; }
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (MeasuredOn > today || MeasuredOn < new DateOnly(2000, 1, 1))
            yield return new ValidationResult("Choose a date from 2000 through today (UTC).", new[] { nameof(MeasuredOn) });
        if (decimal.Round(WeightKg, 2) != WeightKg)
            yield return new ValidationResult("Use up to two decimal places.", new[] { nameof(WeightKg) });
    }
}
public class BodyGoalDto : IValidatableObject
{
    [Required, RegularExpression("^(Track|Gain|Lose)$")] public string Goal { get; set; } = "Track";
    [Range(typeof(decimal),"20","400")] public decimal? StartingWeightKg { get; set; }
    [Range(typeof(decimal),"20","400")] public decimal? TargetWeightKg { get; set; }
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (StartingWeightKg.HasValue != TargetWeightKg.HasValue) yield return new ValidationResult("Enter both starting and target weight.");
        if (StartingWeightKg.HasValue && TargetWeightKg.HasValue && (Goal == "Gain" && TargetWeightKg <= StartingWeightKg || Goal == "Lose" && TargetWeightKg >= StartingWeightKg || Goal == "Track")) yield return new ValidationResult("Choose a target in your selected direction.");
        if (StartingWeightKg.HasValue && decimal.Round(StartingWeightKg.Value,2)!=StartingWeightKg || TargetWeightKg.HasValue && decimal.Round(TargetWeightKg.Value,2)!=TargetWeightKg) yield return new ValidationResult("Use at most two decimal places.");
    }
}
public record Achievement(string Id, string Name, string Description, string Icon, string Color, int Xp, decimal Progress, decimal Target)
{
    public bool Unlocked => Progress >= Target;
}
public record PersonalRecord(string ExerciseId, string Name, decimal WeightKg, decimal PreviousKg, DateTime AchievedOn);
public record JourneyDay(DateTime Date, bool Trained);
public record JourneyOverview(int CurrentStreak, int BestStreak, int TotalWorkouts, int Xp, int Level, int LevelXp,
    int NextLevelXp, bool TrainedToday, DateTime? StreakDeadline, List<JourneyDay> Week, List<Achievement> Achievements,
    List<PersonalRecord> PersonalRecords, string BodyGoal, List<MeasurementResponse> Measurements, decimal? WeightChangeKg)
{
    public int AccountId { get; init; }
    public decimal? StartingWeightKg { get; init; }
    public decimal? TargetWeightKg { get; init; }
    public decimal GoalProgressPercent { get; init; }
    [System.Text.Json.Serialization.JsonIgnore]
    public RankProgress Rank { get; init; } = null!;
    [System.Text.Json.Serialization.JsonIgnore]
    public IReadOnlyList<RankTier> RankLadder { get; init; } = Array.Empty<RankTier>();
    [System.Text.Json.Serialization.JsonIgnore]
    public IReadOnlyList<XpSource> XpBreakdown { get; init; } = Array.Empty<XpSource>();
}
public record RankTier(string Id, int Index, string Name, string Motto, int MinXp, string Color, string Secondary);
public record RankProgress(RankTier Current, RankTier? Next, int XpInRank, int RankSpan, int XpToNext, decimal Percent);
public record XpSource(string Id, string Name, string Description, int Count, int TotalXp);
public record MeasurementResponse(int Id, DateTime MeasuredOn, decimal WeightKg);
