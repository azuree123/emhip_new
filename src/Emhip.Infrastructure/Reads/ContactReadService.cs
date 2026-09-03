using Emhip.Application.Common;
using Emhip.Application.Contacts;
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
}
