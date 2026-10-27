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
            var items = await ordered.ThenBy(t => t.Id)
                .Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToListAsync(cancellationToken);
            return new PagedResult<Training>(items, query.Page, query.PageSize, total);
        }
        public Training? GetById(int id, int userId)
        {
            return _context.Trainings
                .FirstOrDefault(t => t.Id == id && t.UserId == userId);
        }

        public Training Add(int userId, TrainingDto dto)
        {
            var training = new Training
            {
                UserId = userId,
                ExerciseType = dto.ExerciseType!.Value,
                DurationMinutes = dto.DurationMinutes,
                Calories = dto.Calories,
                Intensity = dto.Intensity,
                Fatigue = dto.Fatigue,
                Notes = dto.Notes ?? "",
                TrainingDate = dto.TrainingDate!.Value
            };

            _context.Trainings.Add(training);
            _context.SaveChanges();

            return training;
        }

        public Training? Update(int id, int userId, TrainingDto dto)
        {
            var training = GetById(id, userId);
            if (training == null) return null;

            training.ExerciseType = dto.ExerciseType!.Value;
            training.DurationMinutes = dto.DurationMinutes;
            training.Calories = dto.Calories;
            training.Intensity = dto.Intensity;
            training.Fatigue = dto.Fatigue;
            training.Notes = dto.Notes ?? "";
            training.TrainingDate = dto.TrainingDate!.Value;

            _context.SaveChanges();

            return training;
        }

        public bool Delete(int id, int userId)
        {
            var training = GetById(id, userId);
            if (training == null) return false;

            _context.Trainings.Remove(training);
            _context.SaveChanges();

            return true;
        }

        public object GetMonthlyStats(int userId, int year, int month)
        {
            var trainings = _context.Trainings
                .Where(t => t.UserId == userId &&
                            t.TrainingDate.Year == year &&
                            t.TrainingDate.Month == month)
                .ToList();

            return trainings
                .GroupBy(t => (t.TrainingDate.Day - 1) / 7 + 1)
                .Select(g => new
                {
                    Week = g.Key,
                    TotalDuration = g.Sum(x => x.DurationMinutes),
                    Count = g.Count(),
                    AvgIntensity = Math.Round(g.Average(x => x.Intensity), 2),
                    AvgFatigue = Math.Round(g.Average(x => x.Fatigue), 2)
                })
                .OrderBy(x => x.Week)
                .ToList();
        }
    }

}
