using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using Emhip.Infrastructure.ReadModels;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Infrastructure.Persistence;

public class EmhipDbContext(DbContextOptions<EmhipDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<Hub> Hubs => Set<Hub>();
    public DbSet<StaffMember> StaffMembers => Set<StaffMember>();
    public DbSet<Guest> Guests => Set<Guest>();
    public DbSet<GuestDemographics> GuestDemographics => Set<GuestDemographics>();
    public DbSet<InitialConversationRecord> InitialConversationRecords => Set<InitialConversationRecord>();
    public DbSet<Contact> Contacts => Set<Contact>();
    public DbSet<Note> Notes => Set<Note>();
    public DbSet<RiskAssessment> RiskAssessments => Set<RiskAssessment>();
    public DbSet<FollowUp> FollowUps => Set<FollowUp>();
    public DbSet<CaseworkSession> CaseworkSessions => Set<CaseworkSession>();
    public DbSet<PathwayReferral> PathwayReferrals => Set<PathwayReferral>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    // Denormalized read-model tables — maintained only by Emhip.Workers, never written to by
    // command handlers. See ARCHITECTURE.md "Read-model tables for dashboards".
    public DbSet<UrgentCaseReadModel> UrgentCases => Set<UrgentCaseReadModel>();
    public DbSet<DashboardSnapshot> DashboardSnapshots => Set<DashboardSnapshot>();
    public DbSet<PathwayReportAggregate> PathwayReportAggregates => Set<PathwayReportAggregate>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(EmhipDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
