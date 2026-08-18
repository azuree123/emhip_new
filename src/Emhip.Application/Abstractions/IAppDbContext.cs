using Emhip.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Abstractions;

/// <summary>
/// The write-side surface command handlers depend on. Deliberately narrow — Application
/// never depends on Emhip.Infrastructure or EF Core's SQL Server provider, only on this
/// abstraction (implemented by EmhipDbContext).
/// </summary>
public interface IAppDbContext
{
    DbSet<Hub> Hubs { get; }
    DbSet<Guest> Guests { get; }
    DbSet<GuestDemographics> GuestDemographics { get; }
    DbSet<InitialConversationRecord> InitialConversationRecords { get; }
    DbSet<Contact> Contacts { get; }
    DbSet<Note> Notes { get; }
    DbSet<RiskAssessment> RiskAssessments { get; }
    DbSet<FollowUp> FollowUps { get; }
    DbSet<CaseworkSession> CaseworkSessions { get; }
    DbSet<PathwayReferral> PathwayReferrals { get; }
    DbSet<DialogAssessment> DialogAssessments { get; }
    DbSet<GuestAction> GuestActions { get; }
    DbSet<GuestClinicalProfile> GuestClinicalProfiles { get; }
    DbSet<AuditEvent> AuditEvents { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
