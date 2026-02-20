using BE.DTOs;
using BE.Models;


namespace BE.Services.Interfaces
{
    public interface ITrainingService
    {
        IEnumerable<Training> GetAll(int userId);
        Training? GetById(int id, int userId);
        Training Add(int userId, TrainingDto dto);
        Training? Update(int id, int userId, TrainingDto dto);
        bool Delete(int id, int userId);
        object GetMonthlyStats(int userId, int year, int month);
    }
}
