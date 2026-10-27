using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using BE.Data;
using BE.Models;
using BE.Services.Implementations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace BE.Tests;

public partial class ApiIntegrationTests
{
    private async Task<HttpResponseMessage> LoginSession() => await client.PostAsJsonAsync("/api/auth/login", new { email = "owner@test.com", password = "Password123!" });
    private static string SessionCookie(HttpResponseMessage response) => response.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("training_refresh=")).Split(';')[0];
    private async Task<HttpResponseMessage> SessionRequest(string path, string cookie)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, path);
        request.Headers.Add("Cookie", cookie);
        return await client.SendAsync(request);
    }

    [Fact]
    public async Task LoginRefreshAndLogoutWorkOverHttp()
    {
        var login = await LoginSession();
        login.EnsureSuccessStatusCode();
        var body = await login.Content.ReadFromJsonAsync<JsonElement>();
        var expiry = body.GetProperty("expiresAtUtc").GetDateTime();
        Assert.InRange(expiry - DateTime.UtcNow, TimeSpan.FromMinutes(14), TimeSpan.FromMinutes(16));
        var cookie = SessionCookie(login);
        var header = login.Headers.GetValues("Set-Cookie").Single();
        Assert.Contains("httponly", header.ToLowerInvariant());
        Assert.Contains("secure", header.ToLowerInvariant());
        Assert.Contains("samesite=strict", header.ToLowerInvariant());
        using (var scope = factory.Services.CreateScope())
        {
            var stored = scope.ServiceProvider.GetRequiredService<AppDbContext>().RefreshTokens.Single();
            var raw = Uri.UnescapeDataString(cookie["training_refresh=".Length..]);
            Assert.Equal(RefreshTokenSecurity.Hash(raw), stored.TokenHash);
            Assert.NotEqual(raw, stored.TokenHash);
        }
        var refresh = await SessionRequest("/api/auth/refresh", cookie);
        refresh.EnsureSuccessStatusCode();
        var replacement = SessionCookie(refresh);
        Assert.NotEqual(cookie, replacement);
        await AssertProblem(await SessionRequest("/api/auth/refresh", cookie), HttpStatusCode.Unauthorized);
        Assert.Equal(HttpStatusCode.NoContent, (await SessionRequest("/api/auth/logout", replacement)).StatusCode);
        await AssertProblem(await SessionRequest("/api/auth/refresh", replacement), HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task RefreshReadsUpdatedRoleFromDatabase()
    {
        var login = await LoginSession();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Users.Single(u => u.Email == "owner@test.com").Role = Roles.Admin;
            db.SaveChanges();
        }
        var refresh = await SessionRequest("/api/auth/refresh", SessionCookie(login));
        refresh.EnsureSuccessStatusCode();
        var result = await refresh.Content.ReadFromJsonAsync<JsonElement>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", result.GetProperty("token").GetString());
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/admin/summary")).StatusCode);
    }

    [Fact]
    public async Task ExpiredRefreshCookieCannotStartNewSession()
    {
        var login = await LoginSession();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.RefreshTokens.Single().ExpiresAtUtc = DateTime.UtcNow.AddMinutes(-1);
            db.SaveChanges();
        }
        await AssertProblem(await SessionRequest("/api/auth/refresh", SessionCookie(login)), HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData("expired")]
    [InlineData("wrong-signature")]
    [InlineData("wrong-audience")]
    [InlineData("malformed")]
    public async Task InvalidAccessTokensAreRejected(string variant)
    {
        var config = factory.Services.GetRequiredService<IConfiguration>();
        var key = variant == "wrong-signature" ? "different-signing-key-at-least-32-bytes" : config["Jwt:Key"]!;
        var jwt = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"], audience: variant == "wrong-audience" ? "other-audience" : config["Jwt:Audience"],
            claims: new[] { new Claim(ClaimTypes.NameIdentifier, "1") },
            expires: variant == "expired" ? DateTime.UtcNow.AddMinutes(-1) : DateTime.UtcNow.AddMinutes(5),
            signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256));
        var token = variant == "malformed" ? "invalid.token" : new JwtSecurityTokenHandler().WriteToken(jwt);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        await AssertProblem(await client.GetAsync("/api/trainings"), HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task OpenApiDocumentsRealSecurityAndResponseContracts()
    {
        var document = await client.GetFromJsonAsync<JsonElement>("/swagger/v1/swagger.json");
        var paths = document.GetProperty("paths");
        foreach (var path in new[] { "register", "login", "refresh", "logout" })
        {
            var operation = paths.GetProperty($"/api/auth/{path}").GetProperty("post");
            Assert.False(operation.TryGetProperty("security", out var security) && security.GetArrayLength() > 0);
            Assert.True(operation.TryGetProperty("summary", out _));
        }
        var list = paths.GetProperty("/api/trainings").GetProperty("get");
        Assert.True(list.GetProperty("security")[0].TryGetProperty("Bearer", out _));
        var admin = paths.GetProperty("/api/admin/summary").GetProperty("get");
        Assert.Contains("Admin", admin.GetProperty("description").GetString());
        Assert.True(admin.GetProperty("responses").TryGetProperty("403", out _));
        Assert.True(paths.GetProperty("/api/auth/login").GetProperty("post").GetProperty("responses").TryGetProperty("401", out _));
        var schemas = document.GetProperty("components").GetProperty("schemas");
        Assert.True(schemas.GetProperty("TokenResponse").GetProperty("properties").TryGetProperty("expiresAtUtc", out _));
        Assert.Equal("marko@example.com", schemas.GetProperty("RegisterDto").GetProperty("example").GetProperty("email").GetString());
        Assert.True(list.GetProperty("responses").GetProperty("200").GetProperty("content").GetProperty("application/json").GetProperty("schema").TryGetProperty("$ref", out _));
    }
}
