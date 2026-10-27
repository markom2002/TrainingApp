using Microsoft.EntityFrameworkCore;
using BE.Services.Implementations;
using Microsoft.AspNetCore.Mvc;
using BE.Data;
using BE.DTOs;
using BE.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.Text;



namespace BE.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        /// <summary>Create a User account.</summary>
        /// <remarks>Public endpoint. Role is assigned by the server; sample credentials do not exist until registered.</remarks>
        [ProducesResponseType(typeof(MessageResponse), 200)]
        [ProducesResponseType(typeof(ValidationProblemDetails), 400)]
        [ProducesResponseType(typeof(ProblemDetails), 409)]
        [HttpPost("register")]
        public IActionResult Register(RegisterDto dto)
        {
            dto.Email = dto.Email.Trim();
            if (_context.Users.Any(u => u.Email == dto.Email))
                return Problem(statusCode: 409, title: "Account already exists", detail: "An account with this email already exists.");

            var user = new User
            {
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Gender = dto.Gender
            };

            _context.Users.Add(user);
            _context.SaveChanges();

            return Ok(new MessageResponse("User registered successfully"));
        }


        /// <summary>Sign in and start a seven-day refresh session.</summary>
        /// <remarks>Returns a 15-minute JWT and a Secure, HttpOnly refresh cookie. Paste only token into Authorize.</remarks>
        [ProducesResponseType(typeof(TokenResponse), 200)]
        [ProducesResponseType(typeof(ValidationProblemDetails), 400)]
        [ProducesResponseType(typeof(ProblemDetails), 401)]
        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            dto.Email = dto.Email.Trim();
            var user = _context.Users.FirstOrDefault(u => u.Email == dto.Email);

            if (user == null)
                return Unauthorized(new ProblemDetails { Status = 401, Title = "Invalid credentials", Detail = "Email or password is incorrect." });

            if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return Unauthorized(new ProblemDetails { Status = 401, Title = "Invalid credentials", Detail = "Email or password is incorrect." });

            return await IssueTokens(user);
        }

        private const string CookieName = "training_refresh";

        private CookieOptions RefreshCookie(DateTime expires) => new()
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Path = "/api/auth",
            Expires = new DateTimeOffset(expires)
        };

        /// <summary>Rotate the refresh cookie and issue a fresh access JWT.</summary>
        /// <remarks>Uses the training_refresh cookie set by login. Does not require an access JWT. Reused or expired cookies return 401.</remarks>
        [ProducesResponseType(typeof(TokenResponse), 200)]
        [ProducesResponseType(typeof(ProblemDetails), 401)]
        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh()
        {
            if (!Request.Cookies.TryGetValue(CookieName, out var rawToken))
                return Unauthorized(new ProblemDetails { Status = 401, Title = "Session expired", Detail = "Please log in again." });

            var hash = RefreshTokenSecurity.Hash(rawToken);
            var stored = await _context.RefreshTokens.Include(t => t.User)
                .SingleOrDefaultAsync(t => t.TokenHash == hash);
            if (stored == null || stored.RevokedAtUtc != null || stored.ExpiresAtUtc <= DateTime.UtcNow)
                return Unauthorized(new ProblemDetails { Status = 401, Title = "Session expired", Detail = "Please log in again." });

            stored.RevokedAtUtc = DateTime.UtcNow;
            try
            {
                return await IssueTokens(stored.User, stored.ExpiresAtUtc);
            }
            catch (DbUpdateConcurrencyException)
            {
                return Unauthorized(new ProblemDetails { Status = 401, Title = "Session already refreshed", Detail = "Please log in again." });
            }
        }

        /// <summary>Revoke the current refresh session and remove its cookie.</summary>
        /// <remarks>Idempotent. Does not require an access JWT; previously issued JWTs remain valid until expiry.</remarks>
        [ProducesResponseType(204)]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            if (Request.Cookies.TryGetValue(CookieName, out var rawToken))
            {
                var hash = RefreshTokenSecurity.Hash(rawToken);
                await _context.RefreshTokens.Where(t => t.TokenHash == hash && t.RevokedAtUtc == null)
                    .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAtUtc, DateTime.UtcNow));
            }
            Response.Cookies.Delete(CookieName, RefreshCookie(DateTime.UtcNow));
            return NoContent();
        }

        private async Task<IActionResult> IssueTokens(User user, DateTime? sessionExpiry = null)
        {
            var now = DateTime.UtcNow;
            var expires = now.AddMinutes(15);
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
            var jwt = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"], audience: _configuration["Jwt:Audience"],
                claims: claims, expires: expires,
                signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
            var rawToken = RefreshTokenSecurity.Generate();
            var refreshExpiry = sessionExpiry ?? now.AddDays(7);
            _context.RefreshTokens.Add(new RefreshToken
            {
                TokenHash = RefreshTokenSecurity.Hash(rawToken),
                UserId = user.Id,
                ExpiresAtUtc = refreshExpiry
            });
            await _context.SaveChangesAsync();
            Response.Cookies.Append(CookieName, rawToken, RefreshCookie(refreshExpiry));
            return Ok(new TokenResponse(new JwtSecurityTokenHandler().WriteToken(jwt), expires));
        }
    }
}
