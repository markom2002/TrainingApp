using System.ComponentModel.DataAnnotations;
using BE.Validation;

namespace BE.DTOs;

public class LoginDto
{
    [Required, StringLength(254)]
    public string Email { get; set; } = string.Empty;

    // No minimum length here: existing accounts must still be able to sign in.
    [Required, BcryptPassword]
    public string Password { get; set; } = string.Empty;
}
