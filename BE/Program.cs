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




var builder = WebApplication.CreateBuilder(args);
DevelopmentHttps.Configure(builder);
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("Configure Jwt__Key with a private signing key of at least 32 UTF-8 bytes.");
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Configure ConnectionStrings__DefaultConnection.");



builder.Services.AddProblemDetails();
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

app.UseExceptionHandler();
app.UseStatusCodePages();
var serveFrontend = Directory.Exists(Path.Combine(app.Environment.ContentRootPath, "wwwroot"));
if (serveFrontend)
{
    app.UseDefaultFiles();
    var staticTypes = new FileExtensionContentTypeProvider();
    staticTypes.Mappings[".cer"] = "application/pkix-cert";
    staticTypes.Mappings[".glb"] = "model/gltf-binary";
    app.UseStaticFiles(new StaticFileOptions { ContentTypeProvider = staticTypes });
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

app.MapControllers();
app.MapGet("/health/live", () => Results.Ok(new { status = "Healthy" }));
if (serveFrontend)
{
    app.MapFallback("/api/{**path}", () => Results.NotFound());
    app.MapFallbackToFile("index.html");
}


app.Run();
public partial class Program { }
