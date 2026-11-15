using BE.Documentation;
using Microsoft.EntityFrameworkCore;
using BE.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;
using BE.Services.Interfaces;
using BE.Services.Implementations;
using Microsoft.AspNetCore.StaticFiles;
using BE.Infrastructure;




var migrationRequested = args.Contains("--migrate", StringComparer.Ordinal);
var builder = WebApplication.CreateBuilder(args.Where(arg => arg != "--migrate").ToArray());
DevelopmentHttps.Configure(builder);
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("Configure Jwt__Key with a private signing key of at least 32 UTF-8 bytes.");
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Configure ConnectionStrings__DefaultConnection.");



builder.Services.AddProblemDetails();
builder.AddApiOperations();
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        connectionString
    ));
builder.Services.AddScoped<ITrainingService, TrainingService>();
builder.Services.AddScoped<JourneyService>();



builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular",
        policy =>
        {
            policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>())
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});


//Auth

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    var key = Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!);

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
        ValidateIssuerSigningKey = true,

        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key)
    };
});


builder.Services.AddAuthorization();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Paste the access token only. Swagger adds the Bearer prefix automatically.",
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer"
    });

    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Gym Training Tracker API",
        Version = "v1",
        Description = "Register, then log in and paste only the returned token into Authorize (no Bearer prefix). " +
            "Example credentials are sample inputs, not a pre-created account. " +
            "Authentication identifies the caller; authorization restricts roles and workout ownership. " +
            "Access JWTs expire after 15 minutes. Refresh uses an HttpOnly cookie and rotates it; " +
            "logout revokes the refresh session. Browser cookies are sent automatically to the same HTTPS host. " +
            "User accounts cannot access Admin statistics; both roles may change only their own workouts."
    });
    options.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, "BE.xml"));
    options.OperationFilter<AuthorizationOperationFilter>();
    options.SchemaFilter<RequestExamplesFilter>();
});


var app = builder.Build();
if (app.Configuration.GetValue<bool>("Demo:Enabled"))
{
    var demoConnection = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(
        app.Configuration.GetConnectionString("DefaultConnection"));
    if (!string.Equals(demoConnection.InitialCatalog, "TrainingDemo", StringComparison.Ordinal))
        throw new InvalidOperationException("Demo mode requires a separate database named TrainingDemo.");
}
// An explicit deployment step; ordinary application starts never change the schema.
if (migrationRequested)
{
    await using var scope = app.Services.CreateAsyncScope();
    var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await database.Database.MigrateAsync();
    app.Logger.LogInformation("Database migrations completed.");
    return;
}
// A separate, setup-only HTTP origin lets a phone download the public certificate
// before trusting HTTPS. Never expose login, private data or the app on this port.
if (app.Environment.IsDevelopment() && app.Configuration.GetValue<bool>("PhoneSetup:Enabled"))
{
    app.Use(async (context, next) =>
    {
        if (context.Connection.LocalPort == 7088)
        {
            var path = context.Request.Path.Value;
            if ((HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method)) &&
                (path == "/phone-setup.html" || path == "/certificates/form-local-root.cer"))
            {
                context.Response.Headers.CacheControl = "no-store";
                await next();
                return;
            }
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }
        await next();
    });
}

app.UseMiddleware<RequestLoggingMiddleware>();
app.UseExceptionHandler();
app.UseStatusCodePages();
var serveFrontend = Directory.Exists(Path.Combine(app.Environment.ContentRootPath, "wwwroot"));
if (serveFrontend)
{
    app.UseDefaultFiles();
    var staticTypes = new FileExtensionContentTypeProvider();
    staticTypes.Mappings[".cer"] = "application/pkix-cert";
    staticTypes.Mappings[".glb"] = "model/gltf-binary";
    app.UseStaticFiles(new StaticFileOptions
    {
        ContentTypeProvider = staticTypes,
        OnPrepareResponse = context =>
        {
            if (context.File.Name is "manifest.webmanifest" or "sw.js" or "index.html")
                context.Context.Response.Headers.CacheControl = "no-cache";
        }
    });
}
// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAngular");

if (!LocalPreview.Enabled(app.Configuration, app.Environment)) app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapControllers();
app.MapGet("/health/live", () => Results.Ok(new { status = "Healthy" }));
app.MapReadiness();
if (serveFrontend)
{
    app.MapFallback("/api/{**path}", () => Results.NotFound());
    app.MapFallbackToFile("index.html");
}


app.Run();
public partial class Program { }
