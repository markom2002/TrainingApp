using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BE.Infrastructure;

public static class ApiOperations
{
    public static void AddApiOperations(this WebApplicationBuilder builder)
    {
        builder.Services.AddHealthChecks().AddCheck<DatabaseReadinessCheck>("database", tags: new[] { "ready" });
        builder.Services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = builder.Configuration.GetValue("Security:AuthRequestsPerMinute", 10),
                    Window = TimeSpan.FromMinutes(1), QueueLimit = 0, AutoReplenishment = true
                }));
            options.OnRejected = async (rejected, ct) =>
            {
                var retry = rejected.Lease.TryGetMetadata(MetadataName.RetryAfter, out var duration)
                    ? Math.Max(1, (int)Math.Ceiling(duration.TotalSeconds)) : 60;
                rejected.HttpContext.Response.Headers.RetryAfter = retry.ToString(CultureInfo.InvariantCulture);
                await Results.Problem(statusCode: 429, title: "Too many attempts",
                    detail: "Wait a moment before trying again.").ExecuteAsync(rejected.HttpContext);
            };
        });
    }

    public static void MapReadiness(this WebApplication app) => app.MapHealthChecks("/health/ready", new HealthCheckOptions
    {
        Predicate = check => check.Tags.Contains("ready"),
        ResponseWriter = (context, report) => context.Response.WriteAsJsonAsync(new { status = report.Status.ToString() })
    });
}
