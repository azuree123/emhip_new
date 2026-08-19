using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using Emhip.Infrastructure.Identity;
using Emhip.Infrastructure.ReadModels;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Infrastructure.Persistence;

public class EmhipDbContext(DbContextOptions<EmhipDbContext> options)
    : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>(options), IAppDbContext
{
    public DbSet<Hub> Hubs => Set<Hub>();
    public DbSet<Guest> Guests => Set<Guest>();
    public DbSet<GuestDemographics> GuestDemographics => Set<GuestDemographics>();
    public DbSet<InitialConversationRecord> InitialConversationRecords => Set<InitialConversationRecord>();
    public DbSet<Contact> Contacts => Set<Contact>();
    public DbSet<Note> Notes => Set<Note>();
    public DbSet<RiskAssessment> RiskAssessments => Set<RiskAssessment>();
    public DbSet<FollowUp> FollowUps => Set<FollowUp>();
    public DbSet<CaseworkSession> CaseworkSessions => Set<CaseworkSession>();
    public DbSet<PathwayReferral> PathwayReferrals => Set<PathwayReferral>();
    public DbSet<DialogAssessment> DialogAssessments => Set<DialogAssessment>();
    public DbSet<GuestAction> GuestActions => Set<GuestAction>();
    public DbSet<GuestClinicalProfile> GuestClinicalProfiles => Set<GuestClinicalProfile>();
    public DbSet<UrgentEpisode> UrgentEpisodes => Set<UrgentEpisode>();
    public DbSet<ExportRecord> ExportRecords => Set<ExportRecord>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentVersion> DocumentVersions => Set<DocumentVersion>();
    public DbSet<AppSetting> AppSettings => Set<AppSetting>();
    public DbSet<LookupItem> LookupItems => Set<LookupItem>();
    public DbSet<EmailTemplate> EmailTemplates => Set<EmailTemplate>();
    public DbSet<CustomFieldDefinition> CustomFieldDefinitions => Set<CustomFieldDefinition>();
    public DbSet<CustomFieldValue> CustomFieldValues => Set<CustomFieldValue>();
    public DbSet<CaseworkNote> CaseworkNotes => Set<CaseworkNote>();
    public DbSet<PathwayChange> PathwayChanges => Set<PathwayChange>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    // Denormalized read-model tables — maintained only by Emhip.Workers, never written to by
    // command handlers. See ARCHITECTURE.md "Read-model tables for dashboards".
    public DbSet<UrgentCaseReadModel> UrgentCases => Set<UrgentCaseReadModel>();
    public DbSet<DashboardSnapshot> DashboardSnapshots => Set<DashboardSnapshot>();
    public DbSet<PathwayReportAggregate> PathwayReportAggregates => Set<PathwayReportAggregate>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Backs Guests.GuestNumber's default. Start value is set dynamically in the migration
        // (above the backfilled maximum), so the model start value here is never authoritative.
        modelBuilder.HasSequence<int>("GuestNumbers", "dbo");

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(EmhipDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
