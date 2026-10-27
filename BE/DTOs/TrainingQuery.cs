using System.ComponentModel.DataAnnotations;
using BE.Models;

namespace BE.DTOs;

public class TrainingQuery : IValidatableObject
{
    [Range(1, 1000000)]
    public int Page { get; set; } = 1;
    [Range(1, 100)]
    public int PageSize { get; set; } = 10;
    [EnumDataType(typeof(ExerciseType))]
    public ExerciseType? ExerciseType { get; set; }
    public DateOnly? From { get; set; }
    public DateOnly? To { get; set; }
    [Required, RegularExpression("^(trainingDate|durationMinutes|calories|intensity)$")]
    public string SortBy { get; set; } = "trainingDate";
    [Required, RegularExpression("^(asc|desc)$")]
    public string SortDirection { get; set; } = "desc";

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (From.HasValue && To.HasValue && From.Value > To.Value)
            yield return new ValidationResult("From date must be on or before To date.", new[] { nameof(From), nameof(To) });
    }
}

public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)
{
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}
