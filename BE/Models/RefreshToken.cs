using System.ComponentModel.DataAnnotations;

namespace BE.Models;

public class RefreshToken
{
    public int Id { get; set; }
    [MaxLength(64)]
    public string TokenHash { get; set; } = string.Empty;
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTime ExpiresAtUtc { get; set; }
    [ConcurrencyCheck]
    public DateTime? RevokedAtUtc { get; set; }
}
