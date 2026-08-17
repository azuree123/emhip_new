using System.Text;
using Emhip.Api.Auth;
using Emhip.Api.Hubs;
using Emhip.Api.Middleware;
using Emhip.Api.Notifications;
using Emhip.Application;
using Emhip.Application.Abstractions;
using Emhip.Domain.Authorization;
using Emhip.Infrastructure;
using Emhip.Infrastructure.Identity;
using Emhip.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

const string AngularClientCorsPolicy = "AngularClient";

// Enums serialize as their names ("Active"), not ordinals — the Angular client types
// statuses as string unions and keys badge styling off the names.
builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c => c.SwaggerDoc("v1", new OpenApiInfo { Title = "EMHIP API", Version = "v1" }));

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddScoped<IUrgentCaseNotifier, SignalRUrgentCaseNotifier>();
builder.Services.AddSingleton<IEmailSender, LoggingEmailSender>();

// --- ASP.NET Core Identity + JWT ---------------------------------------------------------
builder.Services
    .AddIdentity<ApplicationUser, ApplicationRole>(options =>
    {
        options.Password.RequiredLength = 10;
        options.Password.RequireNonAlphanumeric = false;
        options.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<EmhipDbContext>()
    .AddDefaultTokenProviders();

var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
    ?? throw new InvalidOperationException("Missing Jwt configuration section.");
builder.Services.AddSingleton(jwtOptions);
builder.Services.AddScoped<TokenService>();

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
        };

        // Browsers can't set an Authorization header on the WebSocket handshake, so SignalR
        // clients pass the token as ?access_token=... instead — this reads it from there for
        // requests under /hubs, exactly like the standard ASP.NET Core SignalR + JWT recipe.
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken) && context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            },
        };
    });

builder.Services.AddAuthorizationBuilder();
builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();
builder.Services.AddAuthorization(options =>
{
    foreach (var permission in Permissions.All)
    {
        options.AddPolicy(permission, policy => policy.Requirements.Add(new PermissionRequirement(permission)));
    }
});
// -------------------------------------------------------------------------------------------

// Same enum-as-name convention as the REST endpoints for pushed payloads.
builder.Services.AddSignalR()
    .AddJsonProtocol(o => o.PayloadSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));

builder.Services.AddExceptionHandler<ValidationExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddCors(options => options.AddPolicy(AngularClientCorsPolicy, policy =>
    policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:4200"])
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()));

var app = builder.Build();

// Docker Compose demo/dev convenience only — applies pending EF Core migrations and seeds
// default roles/permissions (bootstrapping a first Admin user if none exists — see
// IdentitySeeder) on startup, so `docker compose up` works with no manual `dotnet ef database
// update` step. Off by default; a real production rollout should apply migrations and seed
// roles as an explicit deploy step instead, since both require the target DB to be reachable
// (this also keeps WebApplicationFactory-based tests, which have no DB, able to start the host).
if (builder.Configuration.GetValue<bool>("ApplyMigrationsOnStartup"))
{
    using var migrationScope = app.Services.CreateScope();
    await migrationScope.ServiceProvider.GetRequiredService<EmhipDbContext>().Database.MigrateAsync();
    await IdentitySeeder.SeedAsync(migrationScope.ServiceProvider);
}

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Containers here run plain HTTP behind whatever terminates TLS in front of them (nginx in the
// Docker Compose setup, a load balancer in real deployments) — redirecting to HTTPS in-process
// would just loop, since the container itself never serves HTTPS.
if (!app.Environment.IsEnvironment("Docker"))
{
    app.UseHttpsRedirection();
}

app.UseCors(AngularClientCorsPolicy);
app.UseAuthentication();
app.UseAuthorization();

app.UseMiddleware<AuditReadLoggingMiddleware>();

app.MapControllers();
app.MapHub<UrgentCasesHub>("/hubs/urgent-cases");

// Liveness probe — deliberately doesn't touch the database, unlike everything else here.
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();

// Exposed for Emhip.IntegrationTests' WebApplicationFactory<Program>.
public partial class Program;
