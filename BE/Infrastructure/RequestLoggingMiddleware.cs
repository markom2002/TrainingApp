using System.Diagnostics;

namespace BE.Infrastructure;

public sealed class RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var traceId = Activity.Current?.TraceId.ToString() ?? context.TraceIdentifier;
        context.Response.Headers["X-Request-ID"] = traceId;
        using var scope = logger.BeginScope(new Dictionary<string, object> { ["TraceId"] = traceId });
        var started = Stopwatch.GetTimestamp();
        try { await next(context); }
        finally
        {
            if (context.Request.Path.StartsWithSegments("/api"))
                logger.LogInformation("HTTP {Method} {Path} returned {StatusCode} in {ElapsedMs} ms; trace {TraceId}",
                    context.Request.Method, context.Request.Path.Value, context.Response.StatusCode,
                    Math.Round(Stopwatch.GetElapsedTime(started).TotalMilliseconds, 1), traceId);
        }
    }
}
