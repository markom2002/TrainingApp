using BE.DTOs;
using BE.Models;


namespace BE.Services.Interfaces
{
    public interface ITrainingService
    {
        Task<PagedResult<Training>> GetAll(int userId, TrainingQuery query, CancellationToken cancellationToken = default);
        Task<DashboardOverview> GetOverview(int userId, int year, int month, CancellationToken cancellationToken = default);
        Task<Training?> GetById(int id, int userId, CancellationToken cancellationToken = default);
        Task<Training> Add(int userId, TrainingDto dto, CancellationToken cancellationToken = default);
        Task<Training?> Update(int id, int userId, TrainingDto dto, CancellationToken cancellationToken = default);
        Task<bool> Delete(int id, int userId, CancellationToken cancellationToken = default);
        Task<List<MonthlyTrainingStats>> GetMonthlyStats(int userId, int year, int month, CancellationToken cancellationToken = default);
    }
}
