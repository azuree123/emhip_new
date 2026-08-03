using Emhip.Application.Abstractions;
using Emhip.Infrastructure;
using Emhip.Workers;
using Emhip.Workers.EscalationHandling;
using Emhip.Workers.FollowUpScheduling;
using Emhip.Workers.Notifications;
using Emhip.Workers.Outbox;
using Emhip.Workers.ReportMaterialization;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddInfrastructure(builder.Configuration);

// Background sweeps run with no signed-in staff member; the audit/outbox SaveChanges interceptors
// (registered by AddInfrastructure) still require an ICurrentUser to stamp "who did this".
builder.Services.AddScoped<ICurrentUser, SystemCurrentUser>();

builder.Services.AddSingleton<IOutboxEventChannel, InProcessOutboxEventChannel>();

builder.Services.AddHttpClient<IUrgentCaseNotifier, HttpUrgentCaseNotifier>(client =>
{
    var apiBaseUrl = builder.Configuration["Api:BaseUrl"] ?? "https://localhost:5001/";
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddHostedService<OutboxRelayWorker>();
builder.Services.AddHostedService<EscalationWorker>();
builder.Services.AddHostedService<FollowUpSchedulerWorker>();
builder.Services.AddHostedService<ReportMaterializerWorker>();

var host = builder.Build();
host.Run();
