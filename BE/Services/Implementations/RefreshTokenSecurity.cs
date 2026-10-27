using System.Security.Cryptography;
using System.Text;

namespace BE.Services.Implementations;

public static class RefreshTokenSecurity
{
    public static string Generate() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    public static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
