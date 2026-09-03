using Emhip.Application.Common;
using Emhip.Application.Contacts;
using Emhip.Domain.Enums;
using Emhip.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Infrastructure.Reads;

/// <summary>
/// Hub-wide contact history. Contacts is the high-volume table, so the list is keyset-paged on
/// (OccurredAt DESC, Id DESC) exactly like the per-guest Contact History tab, and the total is
/// only counted on the first page.
/// </summary>
public sealed class ContactReadService(EmhipDbContext db) : IContactReadService
{
    private sealed record ContactCursor(DateTimeOffset OccurredAt, Guid Id);

    public async Task<KeysetPage<ContactHistoryRowDto>> GetHubContactHistoryAsync(
        Guid hubId, ContactHistoryFilter filter, string? cursor, int pageSize, CancellationToken cancellationToken = default)
    {
        var decoded = KeysetCursor.Decode<ContactCursor>(cursor);

        var query =
            from c in db.Contacts.AsNoTracking()
            join g in db.Guests.AsNoTracking() on c.GuestId equals g.Id
            where g.HubId == hubId && !g.IsDeleted
            select new { Contact = c, Guest = g };

        if (filter.GuestId is not null)
        {
            query = query.Where(x => x.Guest.Id == filter.GuestId);
        }
        if (filter.CreatedByStaffId is not null)
        {
            query = query.Where(x => x.Contact.CreatedByStaffId == filter.CreatedByStaffId);
        }
        if (filter.AssignedCmhwId is not null)
        {
            query = query.Where(x => x.Guest.AssignedCmhwId == filter.AssignedCmhwId);
        }
        if (filter.Type is not null)
        {
            query = query.Where(x => x.Contact.Type == filter.Type);
        }
        if (filter.Outcome is not null)
        {
            query = query.Where(x => x.Contact.Outcome == filter.Outcome);
        }
        if (filter.From is not null)
        {
            var fromTs = new DateTimeOffset(filter.From.Value.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
            query = query.Where(x => x.Contact.OccurredAt >= fromTs);
        }
        if (filter.To is not null)
        {
            var toTs = new DateTimeOffset(filter.To.Value.ToDateTime(TimeOnly.MaxValue), TimeSpan.Zero);
            query = query.Where(x => x.Contact.OccurredAt <= toTs);
        }
        if (!string.IsNullOrWhiteSpace(filter.SearchText))
        {
            var term = filter.SearchText.Trim();
            // "G-1001" / "1001" match the sequential reference; anything else matches the name.
            var digits = term.StartsWith("G-", StringComparison.OrdinalIgnoreCase) ? term[2..] : term;
            if (int.TryParse(digits, out var guestNumber))
            {
                query = query.Where(x => x.Guest.GuestNumber == guestNumber
                    || (x.Guest.FirstName + " " + x.Guest.LastName).Contains(term));
            }
            else
            {
                query = query.Where(x => (x.Guest.FirstName + " " + x.Guest.LastName).Contains(term)
                    || (x.Contact.Notes != null && x.Contact.Notes.Contains(term)));
            }
        }

        var total = decoded is null ? await query.CountAsync(cancellationToken) : (int?)null;

        if (decoded is not null)
        {
            query = query.Where(x => x.Contact.OccurredAt < decoded.OccurredAt
                || (x.Contact.OccurredAt == decoded.OccurredAt && x.Contact.Id.CompareTo(decoded.Id) < 0));
        }

        var rows = await query
            .OrderByDescending(x => x.Contact.OccurredAt).ThenByDescending(x => x.Contact.Id)
            .Take(pageSize + 1)
            .Select(x => new
            {
                x.Contact.Id,
                GuestId = x.Guest.Id,
                x.Guest.GuestNumber,
                GuestName = x.Guest.FirstName + " " + x.Guest.LastName,
                GuestStatus = x.Guest.Status.ToString(),
                Type = x.Contact.Type.ToString(),
                Outcome = x.Contact.Outcome.ToString(),
                x.Contact.OccurredAt,
                x.Contact.Notes,
                x.Contact.CreatedByStaffId,
                CreatedByName = db.Users.Where(u => u.Id == x.Contact.CreatedByStaffId).Select(u => u.DisplayName).FirstOrDefault() ?? "Unknown",
                AssignedCmhwName = db.Users.Where(u => u.Id == x.Guest.AssignedCmhwId).Select(u => u.DisplayName).FirstOrDefault(),
            })
            .ToListAsync(cancellationToken);

        var hasMore = rows.Count > pageSize;
        var page = rows.Take(pageSize)
            .Select(r => new ContactHistoryRowDto(
                r.Id, r.GuestId, r.GuestNumber, r.GuestName, r.GuestStatus, r.Type, r.Outcome, r.OccurredAt, r.Notes,
                r.CreatedByStaffId, r.CreatedByName, r.AssignedCmhwName))
            .ToList();

        return new KeysetPage<ContactHistoryRowDto>
        {
            Items = page,
            NextCursor = hasMore ? KeysetCursor.Encode(new ContactCursor(page[^1].OccurredAt, page[^1].Id)) : null,
            HasMore = hasMore,
            TotalCount = total,
        };
    }

    /// <summary>Keyset for the per-guest view: most recent contact first, guest id as the tie-break.</summary>
    private sealed record RecentCursor(DateTimeOffset LastContactAt, Guid Id);

    private static (DateTimeOffset? From, DateTimeOffset? To) Range(ContactsByGuestFilter filter) =>
    (
        filter.From is null ? null : new DateTimeOffset(filter.From.Value.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero),
        filter.To is null ? null : new DateTimeOffset(filter.To.Value.ToDateTime(TimeOnly.MaxValue), TimeSpan.Zero)
    );

    public async Task<KeysetPage<ContactsByGuestRowDto>> GetContactsByGuestAsync(
        Guid hubId, ContactsByGuestFilter filter, string? cursor, int pageSize, CancellationToken cancellationToken = default)
    {
        var decoded = KeysetCursor.Decode<RecentCursor>(cursor);
        var (fromTs, toTs) = Range(filter);

        // Only submitted notes count — a draft is not yet a contact (see CaseworkNote).
        var notes = db.CaseworkNotes.AsNoTracking()
            .Where(n => n.Status == CaseworkNoteStatus.Submitted
                && (fromTs == null || n.OccurredAt >= fromTs) && (toTs == null || n.OccurredAt <= toTs));
        var contacts = db.Contacts.AsNoTracking()
            .Where(c => (fromTs == null || c.OccurredAt >= fromTs) && (toTs == null || c.OccurredAt <= toTs));

        var query = db.Guests.AsNoTracking()
            .Where(g => g.HubId == hubId && !g.IsDeleted)
            .Select(g => new
            {
                g.Id, g.GuestNumber, g.FirstName, g.LastName, g.Status, g.Pathway, g.AssignedCmhwId,
                AssignedCmhwName = db.Users.Where(u => u.Id == g.AssignedCmhwId).Select(u => u.DisplayName).FirstOrDefault(),
                Total = contacts.Count(c => c.GuestId == g.Id),
                Casework = notes.Count(n => n.GuestId == g.Id && n.Category == CaseworkNoteCategory.Casework),
                Activity = notes.Count(n => n.GuestId == g.Id && n.Category == CaseworkNoteCategory.Activity),
                Hospitality = notes.Count(n => n.GuestId == g.Id && n.Category == CaseworkNoteCategory.Hospitality),
                Afa = notes.Count(n => n.GuestId == g.Id && n.Category == CaseworkNoteCategory.Afa),
                Cpn = notes.Count(n => n.GuestId == g.Id && n.IsCpnContact),
                LastContactAt = contacts.Where(c => c.GuestId == g.Id).Max(c => (DateTimeOffset?)c.OccurredAt),
                // Sort key: a submitted note always has its linked Contact, so the contact
                // timestamp covers both; guests with nothing logged are excluded below anyway.
                SortAt = contacts.Where(c => c.GuestId == g.Id).Max(c => (DateTimeOffset?)c.OccurredAt) ?? DateTimeOffset.MinValue,
            })
            // "All guest contacts across your caseload": a guest with nothing logged has no row.
            .Where(x => x.Total > 0 || x.Casework + x.Activity + x.Hospitality + x.Afa + x.Cpn > 0);

        if (filter.AssignedCmhwId is not null)
        {
            query = query.Where(x => x.AssignedCmhwId == filter.AssignedCmhwId);
        }
        if (!string.IsNullOrWhiteSpace(filter.SearchText))
        {
            var term = filter.SearchText.Trim();
            var digits = term.StartsWith("G-", StringComparison.OrdinalIgnoreCase) ? term[2..] : term;
            query = int.TryParse(digits, out var guestNumber)
                ? query.Where(x => x.GuestNumber == guestNumber || (x.FirstName + " " + x.LastName).Contains(term))
                : query.Where(x => (x.FirstName + " " + x.LastName).Contains(term));
        }
        query = filter.Category switch
        {
            ContactHistoryCategory.Casework => query.Where(x => x.Casework > 0),
            ContactHistoryCategory.Activity => query.Where(x => x.Activity > 0),
            ContactHistoryCategory.Hospitality => query.Where(x => x.Hospitality > 0),
            ContactHistoryCategory.Afa => query.Where(x => x.Afa > 0),
            ContactHistoryCategory.Cpn => query.Where(x => x.Cpn > 0),
            _ => query,
        };

        var total = decoded is null ? await query.CountAsync(cancellationToken) : (int?)null;

        // Chronological (flow spec: "Chronological list of every contact, chipped by type").
        if (decoded is not null)
        {
            query = query.Where(x => x.SortAt < decoded.LastContactAt
                || (x.SortAt == decoded.LastContactAt && x.Id.CompareTo(decoded.Id) < 0));
        }

        var rows = await query
            .OrderByDescending(x => x.SortAt).ThenByDescending(x => x.Id)
            .Take(pageSize + 1)
            .ToListAsync(cancellationToken);

        var hasMore = rows.Count > pageSize;
        var page = rows.Take(pageSize)
            .Select(r => new ContactsByGuestRowDto(
                r.Id, r.GuestNumber, r.FirstName + " " + r.LastName, r.Status.ToString(), r.Pathway, r.AssignedCmhwName,
                r.Total, r.Casework, r.Activity, r.Hospitality, r.Afa, r.Cpn, r.LastContactAt))
            .ToList();
        var last = rows.Take(pageSize).LastOrDefault();

        return new KeysetPage<ContactsByGuestRowDto>
        {
            Items = page,
            NextCursor = hasMore && last is not null ? KeysetCursor.Encode(new RecentCursor(last.SortAt, last.Id)) : null,
            HasMore = hasMore,
            TotalCount = total,
        };
    }

    public async Task<ContactHistorySummaryDto> GetContactHistorySummaryAsync(
        Guid hubId, ContactsByGuestFilter filter, CancellationToken cancellationToken = default)
    {
        var (fromTs, toTs) = Range(filter);
        var guests = db.Guests.AsNoTracking().Where(g => g.HubId == hubId && !g.IsDeleted);
        if (filter.AssignedCmhwId is not null)
        {
            guests = guests.Where(g => g.AssignedCmhwId == filter.AssignedCmhwId);
        }

        var notes = db.CaseworkNotes.AsNoTracking()
            .Where(n => n.Status == CaseworkNoteStatus.Submitted
                && (fromTs == null || n.OccurredAt >= fromTs) && (toTs == null || n.OccurredAt <= toTs)
                && guests.Any(g => g.Id == n.GuestId));
        var contacts = db.Contacts.AsNoTracking()
            .Where(c => (fromTs == null || c.OccurredAt >= fromTs) && (toTs == null || c.OccurredAt <= toTs)
                && guests.Any(g => g.Id == c.GuestId));

        return new ContactHistorySummaryDto(
            await contacts.CountAsync(cancellationToken),
            await notes.CountAsync(n => n.Category == CaseworkNoteCategory.Casework, cancellationToken),
            await notes.CountAsync(n => n.Category == CaseworkNoteCategory.Activity, cancellationToken),
            await notes.CountAsync(n => n.Category == CaseworkNoteCategory.Afa || n.Category == CaseworkNoteCategory.Hospitality, cancellationToken),
            await notes.CountAsync(n => n.IsCpnContact, cancellationToken),
            await contacts.Select(c => c.GuestId).Distinct().CountAsync(cancellationToken));
    }
}
