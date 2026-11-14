using BE.Data;
using BE.DTOs;
using BE.Exercises;
using Microsoft.EntityFrameworkCore;

namespace BE.Services.Implementations;

public class JourneyService(AppDbContext db)
{
    public async Task<JourneyOverview> Get(int userId, DateTime today, CancellationToken ct = default)
    {
        today = today.Date;
        var tomorrow = today.AddDays(1);
        var workouts = await db.Trainings.AsNoTracking().Where(t => t.UserId == userId && t.TrainingDate < tomorrow)
            .OrderBy(t => t.TrainingDate).ThenBy(t => t.Id)
            .Select(t => new { t.TrainingDate, t.DurationMinutes, Exercises = t.Exercises.Select(e => new { e.ExerciseId, e.WeightKg, e.Sets }).ToList() }).ToListAsync(ct);
        var days = workouts.Select(t => t.TrainingDate.Date).Distinct().Order().ToList();
        var (current, best) = CalculateStreak(days, today);
        var records = new List<PersonalRecord>();
        var bestLoads = new Dictionary<string, decimal>();
        foreach (var day in workouts.GroupBy(t => t.TrainingDate.Date))
        {
            // Multiple sessions on one date establish one daily high, not artificial PR chains.
            foreach (var exercise in day.SelectMany(t => t.Exercises).GroupBy(e => e.ExerciseId))
            {
                var weight = exercise.Max(e => e.WeightKg);
                if (bestLoads.TryGetValue(exercise.Key, out var previous) && weight > previous)
                    records.Add(new PersonalRecord(exercise.Key, ExerciseCatalog.Find(exercise.Key)?.Name ?? exercise.Key, weight, previous, DateTime.SpecifyKind(day.Key, DateTimeKind.Utc)));
                bestLoads[exercise.Key] = Math.Max(bestLoads.GetValueOrDefault(exercise.Key), weight);
            }
        }
        var measurements = await db.BodyMeasurements.AsNoTracking().Where(m => m.UserId == userId && m.MeasuredOn < tomorrow)
            .OrderBy(m => m.MeasuredOn).Select(m => new MeasurementResponse(m.Id, DateTime.SpecifyKind(m.MeasuredOn, DateTimeKind.Utc), m.WeightKg)).ToListAsync(ct);
        var athlete = await db.Users.AsNoTracking().SingleAsync(u=>u.Id==userId,ct);
        var goal=athlete.BodyGoal;
        var baseline=athlete.StartingWeightKg ?? measurements.FirstOrDefault()?.WeightKg;
        decimal? change = measurements.Count > 0 && baseline.HasValue ? measurements[^1].WeightKg - baseline.Value : null;
        var bodyProgress = goal == "Gain" ? Math.Max(0, change ?? 0) : goal == "Lose" ? Math.Max(0, -(change ?? 0)) : 0;
        var variety = workouts.SelectMany(t => t.Exercises).Select(e => e.ExerciseId).Distinct().Count();
        var achievements = new List<Achievement>
        {
            new("first-step", "The first rep", "Save your first completed workout.", "dumbbell", "violet", 100, Math.Min(workouts.Count, 1), 1),
            new("spark", "Spark", "Build a 3-workout-day streak. Rest days count as recovery.", "flame", "orange", 150, Math.Min(best, 3), 3),
            new("unstoppable", "Unstoppable", "Reach a 10-workout-day streak with up to two days of rest between sessions.", "bolt", "violet", 350, Math.Min(best, 10), 10),
            new("twenty-one", "A different you", "Build a 21-workout-day streak.", "trophy", "gold", 600, Math.Min(best, 21), 21),
            new("new-pr", "Raise the bar", "Beat an earlier day's added-weight best in any exercise.", "up", "mint", 200, Math.Min(records.Count, 1), 1),
            new("five-prs", "Built, not born", "Set 5 new daily added-weight records.", "dumbbell", "gold", 400, Math.Min(records.Count, 5), 5),
            new("explorer", "Move differently", "Try 10 different exercises.", "target", "mint", 200, Math.Min(variety, 10), 10),
            new("ten-hours", "Time well spent", "Log 600 minutes of training.", "clock", "violet", 250, Math.Min(workouts.Sum(t => t.DurationMinutes), 600), 600),
            new("fifty", "The long game", "Complete 50 workouts.", "trophy", "gold", 700, Math.Min(workouts.Count, 50), 50),
            new("body-goal", "Your own direction", "Choose gain or lose, then move 2 kg from your first weigh-in toward that goal.", "scale", "mint", 200, Math.Min(bodyProgress, 2), 2)
        };
        foreach(var milestone in new[]{5,15,25,75,100,200}) achievements.Add(new($"sessions-{milestone}",$"The {milestone} club",$"Complete {milestone} workouts.","dumbbell","violet",milestone*5,Math.Min(workouts.Count,milestone),milestone));
        foreach(var milestone in new[]{5,7,14,30}) achievements.Add(new($"streak-{milestone}",$"Momentum {milestone}",$"Build a {milestone}-workout-day streak, recovery included.","flame","orange",milestone*15,Math.Min(best,milestone),milestone));
        foreach(var milestone in new[]{3,10,20}) achievements.Add(new($"records-{milestone}",$"Limit breaker {milestone}",$"Set {milestone} daily added-weight personal records.","up","gold",milestone*35,Math.Min(records.Count,milestone),milestone));
        foreach(var milestone in new[]{5,20,35}) achievements.Add(new($"moves-{milestone}",$"Movement explorer {milestone}",$"Log {milestone} different exercises.","target","mint",milestone*10,Math.Min(variety,milestone),milestone));
        // Body milestones appear only for the chosen direction and stop at the configured target.
        var distance=athlete.StartingWeightKg.HasValue && athlete.TargetWeightKg.HasValue ? Math.Abs(athlete.TargetWeightKg.Value-athlete.StartingWeightKg.Value) : (decimal?)null;
        if(distance.HasValue && distance<2)achievements.RemoveAll(a=>a.Id=="body-goal");
        var sets=workouts.SelectMany(t=>t.Exercises).Sum(e=>e.Sets);
        foreach(var threshold in new[]{50,100,250,500})achievements.Add(new($"sets-{threshold}",$"Rep by rep · {threshold}",$"Log {threshold} completed working sets.","dumbbell","violet",threshold,Math.Min(sets,threshold),threshold));
        foreach(var group in new[]{"Chest","Back","Shoulders","Biceps","Triceps","Quads","Hamstrings","Glutes","Calves","Core","Cardio","Mobility"}){
            var sessions=workouts.Count(t=>t.Exercises.Any(e=>ExerciseCatalog.Find(e.ExerciseId)?.MuscleGroup==group));
            achievements.Add(new($"muscle-{group.ToLowerInvariant()}",$"{group} specialist",$"Complete 5 sessions that include {group.ToLowerInvariant()} movements.","target","mint",150,Math.Min(sessions,5),5));
        }
        var goalPercent=distance>0 ? Math.Clamp(bodyProgress/distance.Value*100,0,100) : 0;
        if(goal!="Track"){
            foreach(var kg in new[]{0.5m,1m,3m,5m}) if(distance==null || kg<=distance) achievements.Add(new($"body-{goal.ToLowerInvariant()}-{kg.ToString(System.Globalization.CultureInfo.InvariantCulture)}",$"Your direction · {kg} kg",$"Move {kg} kg from your starting weight toward your {goal.ToLowerInvariant()} goal.","scale","mint",(int)(kg*100),Math.Min(bodyProgress,kg),kg));
            if(distance>0)foreach(var percent in new[]{25,50,75,100})achievements.Add(new($"goal-{percent}",percent==100?"Your goal. Your moment.":$"Your journey · {percent}%",$"Reach {percent}% of your chosen {athlete.StartingWeightKg} → {athlete.TargetWeightKg} kg goal.","target","mint",percent*3,Math.Min(goalPercent,percent),percent));
        }
        var xp = workouts.Count * 40 + records.Count * 50 + achievements.Where(a => a.Unlocked).Sum(a => a.Xp);
        var weekStart = today.AddDays(-((int)today.DayOfWeek + 6) % 7);
        var week = Enumerable.Range(0, 7).Select(i => new JourneyDay(weekStart.AddDays(i), days.Contains(weekStart.AddDays(i)))).ToList();
        return new JourneyOverview(current, best, workouts.Count, xp, xp / 500 + 1, xp % 500, 500,
            days.Contains(today), current > 0 ? DateTime.SpecifyKind(days[^1].AddDays(3), DateTimeKind.Utc) : null, week, achievements,
            records.OrderByDescending(r => r.AchievedOn).Take(12).ToList(), goal, measurements, change)
        {
            AccountId = userId,
            StartingWeightKg=athlete.StartingWeightKg,TargetWeightKg=athlete.TargetWeightKg,GoalProgressPercent=goalPercent,
            Rank = RankLadder.FromXp(xp),
            RankLadder = RankLadder.Tiers,
            XpBreakdown = new[]
            {
                new XpSource("workouts", "Show up", "40 XP for every completed workout", workouts.Count, workouts.Count * 40),
                new XpSource("records", "Raise the bar", "50 XP for each new daily weight record", records.Count, records.Count * 50),
                new XpSource("achievements", "Make it a milestone", "Bonuses for unlocked achievements", achievements.Count(a => a.Unlocked), achievements.Where(a => a.Unlocked).Sum(a => a.Xp))
            }
        };
    }

    public static (int Current, int Best) CalculateStreak(IEnumerable<DateTime> trainingDays, DateTime today)
    {
        var days = trainingDays.Select(d => d.Date).Where(d => d <= today.Date).Distinct().Order().ToList();
        int run = 0, best = 0;
        DateTime? previous = null;
        foreach (var day in days)
        {
            run = previous.HasValue && (day - previous.Value).Days <= 3 ? run + 1 : 1;
            best = Math.Max(best, run);
            previous = day;
        }
        return (previous.HasValue && (today.Date - previous.Value).Days <= 3 ? run : 0, best);
    }
}
