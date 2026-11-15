using Microsoft.EntityFrameworkCore;
using BE.Data;
using BE.DTOs;
using BE.Models;
using BE.Services.Interfaces;

namespace BE.Services.Implementations
{
    public class TrainingService : ITrainingService
    {
    
        private readonly AppDbContext _context;

        public TrainingService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<PagedResult<Training>> GetAll(int userId, TrainingQuery query, CancellationToken cancellationToken = default)
        {
            var trainings = _context.Trainings.AsNoTracking().Where(t => t.UserId == userId);
            if (query.ExerciseType.HasValue)
                trainings = trainings.Where(t => t.ExerciseType == query.ExerciseType.Value);
            if (query.From.HasValue)
            {
                var from = query.From.Value.ToDateTime(TimeOnly.MinValue);
                trainings = trainings.Where(t => t.TrainingDate >= from);
            }
            if (query.To.HasValue)
            {
                var to = query.To.Value.ToDateTime(TimeOnly.MinValue);
                trainings = trainings.Where(t => t.TrainingDate.Date <= to);
            }
            var total = await trainings.CountAsync(cancellationToken);
            var ascending = query.SortDirection == "asc";
            var ordered = query.SortBy switch
            {
                "durationMinutes" => ascending ? trainings.OrderBy(t => t.DurationMinutes) : trainings.OrderByDescending(t => t.DurationMinutes),
                "calories" => ascending ? trainings.OrderBy(t => t.Calories) : trainings.OrderByDescending(t => t.Calories),
                "intensity" => ascending ? trainings.OrderBy(t => t.Intensity) : trainings.OrderByDescending(t => t.Intensity),
                _ => ascending ? trainings.OrderBy(t => t.TrainingDate) : trainings.OrderByDescending(t => t.TrainingDate)
            };
            // The unique secondary key keeps records with equal sort values in a stable order.
            var items = await ordered.ThenBy(t => t.Id).Include(t => t.Exercises.OrderBy(e => e.Position)).ThenInclude(e => e.SetEntries.OrderBy(s => s.Position))
                .Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToListAsync(cancellationToken);
            return new PagedResult<Training>(items, query.Page, query.PageSize, total);
        }
        public async Task<DashboardOverview> GetOverview(int userId, int year, int month, CancellationToken cancellationToken = default)
        {
            var start = new DateTime(year, month, 1);
            var end = start.AddMonths(1);
            var previous = start.AddMonths(-1);
            var own = _context.Trainings.AsNoTracking().Where(t => t.UserId == userId);
            var current = own.Where(t => t.TrainingDate >= start && t.TrainingDate < end);
            var totals = await current.GroupBy(t => 1).Select(g => new
            {
                Workouts = g.Count(), Minutes = g.Sum(t => t.DurationMinutes), Calories = g.Sum(t => t.Calories),
                Intensity = g.Average(t => t.Intensity), Fatigue = g.Average(t => t.Fatigue)
            }).SingleOrDefaultAsync(cancellationToken);
            var previousCount = await own.CountAsync(t => t.TrainingDate >= previous && t.TrainingDate < start, cancellationToken);
            var weekly = await current.GroupBy(t => (t.TrainingDate.Day - 1) / 7 + 1)
                .Select(g => new WeeklyActivity(g.Key, g.Count(), g.Sum(t => t.DurationMinutes)))
                .ToListAsync(cancellationToken);
            var breakdown = await current.GroupBy(t => t.ExerciseType)
                .Select(g => new ExerciseBreakdown(g.Key, g.Count(), g.Sum(t => t.DurationMinutes)))
                .ToListAsync(cancellationToken);
            var count = totals?.Workouts ?? 0;
            return new DashboardOverview(year, month, count, totals?.Minutes ?? 0, totals?.Calories ?? 0,
                Math.Round(totals?.Intensity ?? 0, 1), Math.Round(totals?.Fatigue ?? 0, 1), previousCount,
                previousCount == 0 ? null : Math.Round((count - previousCount) * 100.0 / previousCount, 1),
                weekly.OrderBy(w => w.Week).ToList(), breakdown.OrderBy(e => e.ExerciseType).ToList());
        }

        public async Task<Training?> GetById(int id, int userId, CancellationToken cancellationToken = default)
        {
            return await _context.Trainings.Include(t => t.Exercises.OrderBy(e => e.Position)).ThenInclude(e => e.SetEntries.OrderBy(s => s.Position))
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId, cancellationToken);
        }

        public async Task<Training> Add(int userId, TrainingDto dto, CancellationToken cancellationToken = default)
        {
            if (dto.ClientId.HasValue)
            {
                var existing = await FindRetry(userId, dto.ClientId.Value, cancellationToken);
                if (existing != null) return existing;
            }
            var training = new Training
            {
                UserId = userId,
                ClientId = dto.ClientId,
                ExerciseType = dto.ExerciseType!.Value,
                DurationMinutes = dto.DurationMinutes,
                Calories = dto.Calories,
                Intensity = dto.Intensity,
                Fatigue = dto.Fatigue,
                Notes = dto.Notes ?? "",
                TrainingDate = dto.TrainingDate!.Value,
                TrainingVariant = dto.TrainingVariant,
                Exercises = MapExercises(dto.Exercises)
            };

            _context.Trainings.Add(training);
            try
            {
                await _context.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException) when (dto.ClientId.HasValue)
            {
                // The unique index arbitrates requests that passed the first lookup together.
                // Discard the failed insert before reading the winner with its exercise graph.
                _context.ChangeTracker.Clear();
                var existing = await FindRetry(userId, dto.ClientId.Value, cancellationToken);
                if (existing == null) throw;
                return existing;
            }

            return training;
        }

        public async Task<Training?> Update(int id, int userId, TrainingDto dto, CancellationToken cancellationToken = default)
        {
            var training = await GetById(id, userId, cancellationToken);
            if (training == null) return null;

            _context.RemoveRange(training.Exercises);
            training.Exercises = MapExercises(dto.Exercises);
            training.TrainingVariant = dto.TrainingVariant;
            training.ExerciseType = dto.ExerciseType!.Value;
            training.DurationMinutes = dto.DurationMinutes;
            training.Calories = dto.Calories;
            training.Intensity = dto.Intensity;
            training.Fatigue = dto.Fatigue;
            training.Notes = dto.Notes ?? "";
            training.TrainingDate = dto.TrainingDate!.Value;

            await _context.SaveChangesAsync(cancellationToken);

            return training;
        }

        private Task<Training?> FindRetry(int userId, Guid clientId, CancellationToken cancellationToken) =>
            _context.Trainings.AsNoTracking()
                .Include(t => t.Exercises.OrderBy(e => e.Position))
                .ThenInclude(e => e.SetEntries.OrderBy(s => s.Position))
                .SingleOrDefaultAsync(t => t.UserId == userId && t.ClientId == clientId, cancellationToken);

        private static List<TrainingExercise> MapExercises(List<TrainingExerciseDto> exercises) => exercises.Select((e, index) => new TrainingExercise
        {
            ExerciseId = e.ExerciseId, Position = index, Sets = e.SetEntries.Count > 0 ? e.SetEntries.Count : e.Sets,
            Reps = e.SetEntries.Count > 0 ? e.SetEntries[0].Reps : e.Reps,
            DurationSeconds = e.SetEntries.Count > 0 ? e.SetEntries[0].DurationSeconds : e.DurationSeconds,
            WeightKg = e.SetEntries.Count > 0 ? e.SetEntries.Max(s => s.WeightKg) : e.WeightKg,
            WeightUnit = e.WeightUnit,
            WeightValue = e.SetEntries.Count > 0 ? e.SetEntries.OrderByDescending(s => s.WeightKg).First().WeightValue : e.WeightValue,
            SetEntries = e.SetEntries.Select((s, i) => new TrainingSet { Position = i, Reps = s.Reps, DurationSeconds = s.DurationSeconds, WeightKg = s.WeightKg, WeightValue = s.WeightValue }).ToList()
        }).ToList();

        public async Task<bool> Delete(int id, int userId, CancellationToken cancellationToken = default)
        {
            var training = await GetById(id, userId, cancellationToken);
            if (training == null) return false;

            _context.Trainings.Remove(training);
            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }

        public async Task<List<MonthlyTrainingStats>> GetMonthlyStats(int userId, int year, int month, CancellationToken cancellationToken = default)
        {
            return await _context.Trainings.AsNoTracking()
                .Where(t => t.UserId == userId && t.TrainingDate.Year == year && t.TrainingDate.Month == month)
                .GroupBy(t => (t.TrainingDate.Day - 1) / 7 + 1)
                .OrderBy(g => g.Key)
                .Select(g => new MonthlyTrainingStats(g.Key, g.Sum(t => t.DurationMinutes), g.Count(),
                    Math.Round(g.Average(t => t.Intensity), 2), Math.Round(g.Average(t => t.Fatigue), 2)))
                .ToListAsync(cancellationToken);
        }
    }

}
