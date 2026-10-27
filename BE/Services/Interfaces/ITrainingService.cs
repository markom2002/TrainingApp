using BE.DTOs;
using BE.Models;


namespace BE.Services.Interfaces
{
    public interface ITrainingService
    {
        Task<PagedResult<Training>> GetAll(int userId, TrainingQuery query, CancellationToken cancellationToken = default);
        Task<DashboardOverview> GetOverview(int userId, int year, int month, CancellationToken cancellationToken = default);
        Training? GetById(int id, int userId);
        Training Add(int userId, TrainingDto dto);
        Training? Update(int id, int userId, TrainingDto dto);
        bool Delete(int id, int userId);
        object GetMonthlyStats(int userId, int year, int month);
    }
}
