using Emhip.Application.Abstractions;
using Emhip.Infrastructure;
using Emhip.Workers.EscalationHandling;
using Emhip.Workers.FollowUpScheduling;
using Emhip.Workers.Notifications;
using Emhip.Workers.Outbox;
using Emhip.Workers.ReportMaterialization;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddInfrastructure(builder.Configuration);

// AddInfrastructure wires AuditSaveChangesInterceptor, which needs an ICurrentUser to stamp
// audit rows. Workers run outside any HTTP request, so writes are attributed to the system
// identity — without this registration every worker SaveChanges fails to resolve the
// interceptor and no background write (outbox relay, snapshots, scheduling) ever lands.
builder.Services.AddSingleton<ICurrentUser, SystemCurrentUser>();

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

/// <summary>The background-service identity: audit rows written by workers carry an empty
/// staff id and are rendered as "System" on the read side.</summary>
file sealed class SystemCurrentUser : ICurrentUser
{
    public Guid StaffId => Guid.Empty;
    public Guid HubId => Guid.Empty;
    public string DisplayName => "System";
    public IReadOnlyList<string> Roles => [];
    public IReadOnlyList<string> Permissions => [];
}
