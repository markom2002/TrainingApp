using BE.Controllers;
using BE.Data;
using BE.Models;
using BE.Services.Implementations;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace BE.Tests;

public class RefreshTokenTests : IDisposable
{
    private readonly SqliteConnection connection = new("Data Source=:memory:");
    private readonly AppDbContext db;
    private readonly AuthController controller;

    public RefreshTokenTests()
    {
        connection.Open();
        db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).Options);
        db.Database.EnsureCreated();
        controller = new AuthController(db, new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "test-only-signing-key-at-least-32-bytes-long",
            ["Jwt:Issuer"] = "tests", ["Jwt:Audience"] = "tests"
        }).Build());
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
    }

    private async Task<RefreshToken> Seed(DateTime expiry, bool revoked = false)
    {
        var token = new RefreshToken
        {
            TokenHash = RefreshTokenSecurity.Hash("original"), ExpiresAtUtc = expiry,
            RevokedAtUtc = revoked ? DateTime.UtcNow : null,
            User = new User { Email = "test@example.com", PasswordHash = "unused", Gender = "Other" }
        };
        db.RefreshTokens.Add(token);
        await db.SaveChangesAsync();
        controller.Request.Headers.Cookie = "training_refresh=original";
        return token;
    }

    [Fact]
    public async Task RefreshRotatesTokenAndRejectsReuse()
    {
        var old = await Seed(DateTime.UtcNow.AddDays(1));
        Assert.IsType<OkObjectResult>(await controller.Refresh());
        Assert.NotNull(old.RevokedAtUtc);
        var replacement = await db.RefreshTokens.SingleAsync(t => t.Id != old.Id);
        Assert.Equal(old.ExpiresAtUtc, replacement.ExpiresAtUtc);
        Assert.NotEqual(old.TokenHash, replacement.TokenHash);
        var cookie = controller.Response.Headers.SetCookie.ToString();
        Assert.Contains("httponly", cookie.ToLowerInvariant());
        Assert.Contains("secure", cookie.ToLowerInvariant());
        Assert.Contains("samesite=strict", cookie.ToLowerInvariant());
        Assert.IsType<UnauthorizedObjectResult>(await controller.Refresh());
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ExpiredOrRevokedTokenCannotRefresh(bool expired)
    {
        await Seed(expired ? DateTime.UtcNow.AddMinutes(-1) : DateTime.UtcNow.AddDays(1), !expired);
        Assert.IsType<UnauthorizedObjectResult>(await controller.Refresh());
        Assert.Equal(1, await db.RefreshTokens.CountAsync());
    }

    [Fact]
    public async Task MissingAndUnknownCookiesAreRejected()
    {
        Assert.IsType<UnauthorizedObjectResult>(await controller.Refresh());
        controller.Request.Headers.Cookie = "training_refresh=unknown";
        Assert.IsType<UnauthorizedObjectResult>(await controller.Refresh());
    }

    [Fact]
    public async Task LogoutRevokesTokenAndIsIdempotent()
    {
        await Seed(DateTime.UtcNow.AddDays(1));
        Assert.IsType<NoContentResult>(await controller.Logout());
        db.ChangeTracker.Clear();
        Assert.IsType<UnauthorizedObjectResult>(await controller.Refresh());
        Assert.IsType<NoContentResult>(await controller.Logout());
    }

    public void Dispose() { db.Dispose(); connection.Dispose(); }
}
