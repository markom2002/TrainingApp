using System.Net;
using BE.Services.Implementations;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.AspNetCore.Hosting;
using Xunit;
using BE.Controllers;
using BE.Data;
using BE.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
namespace BE.Tests;

public class LocalPreviewTests
{
    [Fact]
    public async Task LocalHttpRefreshUsesIndependentHttpOnlyCookie()
    {
        using var connection=new SqliteConnection("Data Source=:memory:");connection.Open();
        using var db=new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).Options);db.Database.EnsureCreated();
        db.RefreshTokens.Add(new RefreshToken{TokenHash=RefreshTokenSecurity.Hash("local-original"),ExpiresAtUtc=DateTime.UtcNow.AddDays(1),User=new User{Email="preview@test.com",PasswordHash="unused",Gender="Other"}});db.SaveChanges();
        var config=new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>{["LocalPreview:AllowHttp"]="true",["Jwt:Key"]="local-preview-test-key-at-least-32-bytes",["Jwt:Issuer"]="tests",["Jwt:Audience"]="tests"}).Build();
        var controller=new AuthController(db,config,new TestEnvironment());
        var context=new DefaultHttpContext();context.Request.Scheme="http";context.Connection.RemoteIpAddress=IPAddress.Parse("192.168.1.25");context.Request.Headers.Cookie="training_refresh_local=local-original";
        controller.ControllerContext=new ControllerContext{HttpContext=context};
        Assert.IsType<OkObjectResult>(await controller.Refresh());
        var cookie=context.Response.Headers.SetCookie.ToString().ToLowerInvariant();
        Assert.Contains("training_refresh_local=",cookie);Assert.Contains("httponly",cookie);Assert.Contains("samesite=strict",cookie);Assert.DoesNotContain("; secure",cookie);
    }
    [Theory]
    [InlineData("Development", true, "http", "192.168.1.25", false)]
    [InlineData("Development", true, "http", "127.0.0.1", false)]
    [InlineData("Development", true, "https", "192.168.1.25", true)]
    [InlineData("Development", true, "http", "8.8.8.8", true)]
    [InlineData("Development", false, "http", "192.168.1.25", true)]
    [InlineData("Production", true, "http", "192.168.1.25", true)]
    public void HttpCookieExceptionIsExplicitDevelopmentOnlyAndPrivate(string environmentName, bool enabled, string scheme, string remoteAddress, bool expectedSecure)
    {
        var config=new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?> { ["LocalPreview:AllowHttp"]=enabled.ToString() }).Build();
        var env=new TestEnvironment { EnvironmentName=environmentName };
        var context=new DefaultHttpContext();context.Request.Scheme=scheme;context.Connection.RemoteIpAddress=IPAddress.Parse(remoteAddress);
        Assert.Equal(expectedSecure,LocalPreview.SecureCookie(config,env,context));
    }
    private class TestEnvironment:IWebHostEnvironment
    {
        public string EnvironmentName{get;set;}="Development";
        public string ApplicationName{get;set;}="Tests";
        public string ContentRootPath{get;set;}="";
        public IFileProvider ContentRootFileProvider{get;set;}=new NullFileProvider();
        public string WebRootPath{get;set;}="";
        public IFileProvider WebRootFileProvider{get;set;}=new NullFileProvider();
    }
}
