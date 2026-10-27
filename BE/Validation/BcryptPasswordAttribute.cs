using System.ComponentModel.DataAnnotations;
using System.Text;

namespace BE.Validation;

// BCrypt considers at most 72 UTF-8 bytes, which can be fewer than 72 characters.
public sealed class BcryptPasswordAttribute : ValidationAttribute
{
    public override bool IsValid(object? value) => value is not string password || Encoding.UTF8.GetByteCount(password) <= 72;
    public BcryptPasswordAttribute() => ErrorMessage = "Password must not exceed 72 UTF-8 bytes.";
}
