using System.Reflection;
using BE.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace BE.Documentation;

public class AuthorizationOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        foreach (var response in operation.Responses.Values)
        {
            var problem = response.Content.Values.FirstOrDefault(c =>
                c.Schema.Reference?.Id is "ProblemDetails" or "ValidationProblemDetails");
            if (problem != null)
                response.Content = new Dictionary<string, OpenApiMediaType> { ["application/problem+json"] = problem };
        }
        var attributes = context.MethodInfo.GetCustomAttributes(true)
            .Concat(context.MethodInfo.DeclaringType?.GetCustomAttributes(true) ?? Array.Empty<object>()).ToList();
        if (attributes.OfType<AllowAnonymousAttribute>().Any() || !attributes.OfType<AuthorizeAttribute>().Any()) return;
        operation.Security = new List<OpenApiSecurityRequirement>
        {
            new() { [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = Array.Empty<string>() }
        };
        var roles = attributes.OfType<AuthorizeAttribute>().Select(a => a.Roles).Where(r => !string.IsNullOrEmpty(r)).ToArray();
        if (roles.Length > 0)
            operation.Description = $"{operation.Description}\n\nRequired role: {string.Join(", ", roles)}.";
        foreach (var (code, description) in new[] { ("401", "Authentication required: supply a valid access JWT."), ("403", "Authenticated, but the required role is missing.") })
            operation.Responses.TryAdd(code, new OpenApiResponse
            {
                Description = description,
                Content = new Dictionary<string, OpenApiMediaType>
                {
                    ["application/problem+json"] = new() { Schema = context.SchemaGenerator.GenerateSchema(typeof(ProblemDetails), context.SchemaRepository) }
                }
            });
    }
}

public class RequestExamplesFilter : ISchemaFilter
{
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        if (context.Type == typeof(LoginDto) || context.Type == typeof(RegisterDto))
        {
            var example = new OpenApiObject
            {
                ["email"] = new OpenApiString("marko@example.com"),
                ["password"] = new OpenApiString("MarkoTest2026!")
            };
            if (context.Type == typeof(RegisterDto)) example["gender"] = new OpenApiString("Male");
            schema.Example = example;
        }
        if (context.Type == typeof(TrainingDto))
            schema.Example = new OpenApiObject
            {
                ["exerciseType"] = new OpenApiString("Strength"),
                ["durationMinutes"] = new OpenApiInteger(45),
                ["calories"] = new OpenApiInteger(250),
                ["intensity"] = new OpenApiInteger(7),
                ["fatigue"] = new OpenApiInteger(5),
                ["trainingDate"] = new OpenApiString("2026-10-27T18:00:00"),
                ["notes"] = new OpenApiString("Upper body workout")
            };
    }
}

