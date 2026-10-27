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

        public IEnumerable<Training> GetAll(int userId)
        {
            return _context.Trainings
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.TrainingDate)
                .ToList();
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
