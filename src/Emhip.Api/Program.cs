using Emhip.Api.Auth;
using Emhip.Api.Hubs;
using Emhip.Api.Middleware;
using Emhip.Api.Notifications;
using Emhip.Application;
using Emhip.Application.Abstractions;
using Emhip.Infrastructure;
using Emhip.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

const string AngularClientCorsPolicy = "AngularClient";

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c => c.SwaggerDoc("v1", new OpenApiInfo { Title = "EMHIP API", Version = "v1" }));

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, DevCurrentUser>();
builder.Services.AddScoped<IUrgentCaseNotifier, SignalRUrgentCaseNotifier>();

builder.Services.AddSignalR();

builder.Services.AddExceptionHandler<ValidationExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddCors(options => options.AddPolicy(AngularClientCorsPolicy, policy =>
    policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:4200"])
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()));

var app = builder.Build();

// Docker Compose demo/dev convenience only — applies pending EF Core migrations on startup so
// `docker compose up` works with no manual `dotnet ef database update` step. Off by default;
// a real production rollout should apply migrations as an explicit deploy step instead.
if (builder.Configuration.GetValue<bool>("ApplyMigrationsOnStartup"))
{
    using var migrationScope = app.Services.CreateScope();
    await migrationScope.ServiceProvider.GetRequiredService<EmhipDbContext>().Database.MigrateAsync();
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
app.UseAuthorization();

app.UseMiddleware<AuditReadLoggingMiddleware>();

app.MapControllers();
app.MapHub<UrgentCasesHub>("/hubs/urgent-cases");

// Liveness probe — deliberately doesn't touch the database, unlike everything else here.
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();

// Exposed for Emhip.IntegrationTests' WebApplicationFactory<Program>.
public partial class Program;
