using Emhip.Application.Mdt;
using Emhip.Domain.Enums;
using Emhip.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Infrastructure.Reads;

/// <summary>MDT queue and the per-guest CPN record — small, guest-scoped reads, so plain EF projections.</summary>
public sealed class MdtReadService(EmhipDbContext db) : IMdtReadService
{
    private IQueryable<MdtQueueItemDto> Project(IQueryable<Domain.Entities.MdtQueueItem> items) =>
        from i in items
        join g in db.Guests.AsNoTracking() on i.GuestId equals g.Id
        select new MdtQueueItemDto(
            i.Id, g.Id, g.GuestNumber, g.FirstName + " " + g.LastName, g.Status.ToString(), g.Pathway,
            db.Users.Where(u => u.Id == g.AssignedCmhwId).Select(u => u.DisplayName).FirstOrDefault(),
            i.Kind, i.Status, i.Reason, i.Details, i.Urgency,
            db.Users.Where(u => u.Id == i.RequestedByStaffId).Select(u => u.DisplayName).FirstOrDefault() ?? "Unknown",
            i.RequestedAt,
            db.Users.Where(u => u.Id == i.ReviewedByStaffId).Select(u => u.DisplayName).FirstOrDefault(),
            i.ReviewedAt, i.ReviewNote,
            db.Users.Where(u => u.Id == i.AssignedCpnStaffId).Select(u => u.DisplayName).FirstOrDefault(),
            i.DeclineReason);

    public async Task<MdtQueueDto> GetQueueAsync(Guid hubId, int reviewedTake = 30, CancellationToken cancellationToken = default)
    {
        var hubItems = db.MdtQueueItems.AsNoTracking()
            .Where(i => db.Guests.Any(g => g.Id == i.GuestId && g.HubId == hubId && !g.IsDeleted));

        var pending = await Project(hubItems.Where(i => i.Status == MdtQueueStatus.Pending).OrderBy(i => i.RequestedAt))
            .ToListAsync(cancellationToken);
        var reviewed = await Project(hubItems.Where(i => i.Status != MdtQueueStatus.Pending).OrderByDescending(i => i.ReviewedAt).Take(reviewedTake))
            .ToListAsync(cancellationToken);

        return new MdtQueueDto(pending, reviewed);
    }

    public async Task<GuestCpnRecordDto> GetGuestCpnRecordAsync(Guid guestId, CancellationToken cancellationToken = default)
    {
        var referral = await Project(db.MdtQueueItems.AsNoTracking()
                .Where(i => i.GuestId == guestId && i.Kind == MdtQueueKind.CpnReferral)
                .OrderByDescending(i => i.RequestedAt))
            .FirstOrDefaultAsync(cancellationToken);

        var cpnInvolved = await db.GuestClinicalProfiles.AsNoTracking()
            .Where(p => p.GuestId == guestId).Select(p => p.CpnInvolved).FirstOrDefaultAsync(cancellationToken);

        var hasAssessment = await db.CpnInitialAssessments.AsNoTracking()
            .AnyAsync(a => a.GuestId == guestId && a.Status == CpnAssessmentStatus.Submitted, cancellationToken);

        var sessions = await db.CaseworkNotes.AsNoTracking()
            .Where(n => n.GuestId == guestId && n.IsCpnContact && n.Status == CaseworkNoteStatus.Submitted)
            .OrderByDescending(n => n.OccurredAt)
            .Select(n => new CpnSessionSummaryDto(
                n.Id, n.OccurredAt, n.ContactMethod.ToString(), n.CpnSessionType, n.SessionNumber,
                db.Users.Where(u => u.Id == n.AuthorStaffId).Select(u => u.DisplayName).FirstOrDefault() ?? "Unknown",
                n.RiskLevel.ToString(), n.Assessment))
            .ToListAsync(cancellationToken);

        var firstContact = sessions.Count == 0 ? (DateTimeOffset?)null : sessions.Min(s => s.OccurredAt);
        var assessmentAt = await db.CpnInitialAssessments.AsNoTracking()
            .Where(a => a.GuestId == guestId && a.Status == CpnAssessmentStatus.Submitted)
            .Select(a => (DateTimeOffset?)a.OccurredAt).FirstOrDefaultAsync(cancellationToken);
        if (assessmentAt is not null && (firstContact is null || assessmentAt < firstContact)) firstContact = assessmentAt;

        return new GuestCpnRecordDto(
            referral,
            cpnInvolved || referral?.Status == MdtQueueStatus.Confirmed,
            referral?.Status == MdtQueueStatus.Confirmed ? referral.AssignedCpnName : null,
            hasAssessment,
            firstContact,
            sessions);
    }
}
