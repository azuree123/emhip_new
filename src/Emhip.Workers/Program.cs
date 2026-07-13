using Emhip.Application.Abstractions;
using Emhip.Infrastructure;
using Emhip.Workers.EscalationHandling;
using Emhip.Workers.FollowUpScheduling;
using Emhip.Workers.Notifications;
using Emhip.Workers.Outbox;
using Emhip.Workers.ReportMaterialization;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddInfrastructure(builder.Configuration);

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
