namespace BE.DTOs;

public record TokenResponse(string Token, DateTime ExpiresAtUtc);
public record MessageResponse(string Message);
public record AdminSummaryResponse(int UserCount, int TrainingCount);
public record MonthlyTrainingStats(int Week, int TotalDuration, int Count, double AvgIntensity, double AvgFatigue);
