using System.ComponentModel.DataAnnotations;
using BE.Validation;

namespace BE.DTOs;

public class RegisterDto
{
    [Required, EmailAddress, StringLength(254)]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8), BcryptPassword]
    public string Password { get; set; } = string.Empty;

    [Required, RegularExpression("^(Male|Female|Other)$", ErrorMessage = "Gender must be Male, Female or Other.")]
    public string Gender { get; set; } = string.Empty;
}
