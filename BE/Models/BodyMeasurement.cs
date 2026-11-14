using System.Text.Json.Serialization;
namespace BE.Models;

public class BodyMeasurement
{
    public int Id { get; set; }
    public int UserId { get; set; }
    [JsonIgnore] public User User { get; set; } = null!;
    public DateTime MeasuredOn { get; set; }
    public decimal WeightKg { get; set; }
}
