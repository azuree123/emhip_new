using Emhip.Application.Common;
using Emhip.Application.Contacts;
using Emhip.Domain.Entities;
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

        // CPN notes are split out: they never count towards a contact type, even if one was stored on them.
        var notes = SubmittedNotes(fromTs, toTs);
        var typedNotes = notes.Where(n => !n.IsCpnContact);
        var cpnAssessments = SubmittedCpnAssessments(fromTs, toTs);
        var contacts = ContactsInRange(fromTs, toTs);

        var query = ScopedGuests(hubId, filter)
            .Select(g => new
            {
                g.Id, g.GuestNumber, g.FirstName, g.LastName, g.Status, g.Pathway,
                AssignedCmhwName = db.Users.Where(u => u.Id == g.AssignedCmhwId).Select(u => u.DisplayName).FirstOrDefault(),
                Total = contacts.Count(c => c.GuestId == g.Id),
                Casework = typedNotes.Count(n => n.GuestId == g.Id && n.Category == CaseworkNoteCategory.Casework),
                Activity = typedNotes.Count(n => n.GuestId == g.Id && n.Category == CaseworkNoteCategory.Activity),
                Hospitality = typedNotes.Count(n => n.GuestId == g.Id && n.Category == CaseworkNoteCategory.Hospitality),
                Afa = typedNotes.Count(n => n.GuestId == g.Id && n.Category == CaseworkNoteCategory.Afa),
                Cpn = notes.Count(n => n.GuestId == g.Id && n.IsCpnContact),
                CpnAssessments = cpnAssessments.Count(a => a.GuestId == g.Id),
                LastContactAt = contacts.Where(c => c.GuestId == g.Id).Max(c => (DateTimeOffset?)c.OccurredAt),
                // Sort key: a submitted note or CPN assessment always has its linked Contact, so the
                // contact timestamp covers all of them; guests with nothing logged are excluded below.
                SortAt = contacts.Where(c => c.GuestId == g.Id).Max(c => (DateTimeOffset?)c.OccurredAt) ?? DateTimeOffset.MinValue,
            })
            // "All guest contacts across your caseload": a guest with nothing logged has no row.
            .Where(x => x.Total > 0 || x.Casework + x.Activity + x.Hospitality + x.Afa + x.Cpn + x.CpnAssessments > 0);

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
            ContactHistoryCategory.Cpn => query.Where(x => x.Cpn + x.CpnAssessments > 0),
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
                r.Total, r.Casework, r.Activity, r.Hospitality, r.Afa, r.Cpn, r.CpnAssessments, r.LastContactAt))
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
        var (guests, notes, cpnAssessments, contacts) = TileSources(hubId, filter);

        // One round trip for every note tile. The contact types exclude CPN notes, so a CPN session
        // can never inflate the AFA & Hospitality figure — CPN has its own section on the screen.
        var noteCounts = await notes
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Casework = g.Count(n => !n.IsCpnContact && n.Category == CaseworkNoteCategory.Casework),
                Activity = g.Count(n => !n.IsCpnContact && n.Category == CaseworkNoteCategory.Activity),
                Afa = g.Count(n => !n.IsCpnContact && n.Category == CaseworkNoteCategory.Afa),
                Hospitality = g.Count(n => !n.IsCpnContact && n.Category == CaseworkNoteCategory.Hospitality),
                CpnSessions = g.Count(n => n.IsCpnContact),
            })
            .FirstOrDefaultAsync(cancellationToken);

        var assessmentCount = await cpnAssessments.CountAsync(cancellationToken);
        var cpnGuests = await guests.CountAsync(
            g => notes.Any(n => n.GuestId == g.Id && n.IsCpnContact) || cpnAssessments.Any(a => a.GuestId == g.Id),
            cancellationToken);

        return new ContactHistorySummaryDto(
            await contacts.CountAsync(cancellationToken),
            noteCounts?.Casework ?? 0,
            noteCounts?.Activity ?? 0,
            (noteCounts?.Afa ?? 0) + (noteCounts?.Hospitality ?? 0),
            noteCounts?.Afa ?? 0,
            noteCounts?.Hospitality ?? 0,
            noteCounts?.CpnSessions ?? 0,
            assessmentCount,
            cpnGuests,
            await contacts.Select(c => c.GuestId).Distinct().CountAsync(cancellationToken));
    }

    public async Task<KeysetPage<ContactListRowDto>> GetContactListAsync(
        Guid hubId, ContactListKind kind, ContactsByGuestFilter filter, string? cursor, int pageSize,
        CancellationToken cancellationToken = default)
    {
        var decoded = KeysetCursor.Decode<ContactCursor>(cursor);
        var (_, notes, cpnAssessments, contacts) = TileSources(hubId, filter);
        var typedNotes = notes.Where(n => !n.IsCpnContact);
        var cpnNotes = notes.Where(n => n.IsCpnContact);

        // Each kind is the exact predicate behind its figure in GetContactHistorySummaryAsync.
        var entries = kind switch
        {
            ContactListKind.All => ContactEntries(contacts),
            ContactListKind.Casework => NoteEntries(typedNotes.Where(n => n.Category == CaseworkNoteCategory.Casework)),
            ContactListKind.Activity => NoteEntries(typedNotes.Where(n => n.Category == CaseworkNoteCategory.Activity)),
            ContactListKind.Hospitality => NoteEntries(typedNotes.Where(n => n.Category == CaseworkNoteCategory.Hospitality)),
            ContactListKind.Afa => NoteEntries(typedNotes.Where(n => n.Category == CaseworkNoteCategory.Afa)),
            ContactListKind.AfaAndHospitality => NoteEntries(typedNotes.Where(n =>
                n.Category == CaseworkNoteCategory.Afa || n.Category == CaseworkNoteCategory.Hospitality)),
            ContactListKind.CpnSessions => NoteEntries(cpnNotes),
            ContactListKind.CpnAssessments => AssessmentEntries(cpnAssessments),
            ContactListKind.Cpn => NoteEntries(cpnNotes).Concat(AssessmentEntries(cpnAssessments)),
            _ => throw new ArgumentOutOfRangeException(nameof(kind), kind, "Unknown contact list."),
        };

        var total = decoded is null ? await entries.CountAsync(cancellationToken) : (int?)null;

        if (decoded is not null)
        {
            entries = entries.Where(e => e.OccurredAt < decoded.OccurredAt
                || (e.OccurredAt == decoded.OccurredAt && e.Id.CompareTo(decoded.Id) < 0));
        }

        var rows = await (
                from e in entries
                join g in db.Guests on e.GuestId equals g.Id
                orderby e.OccurredAt descending, e.Id descending
                select new
                {
                    e.Id, e.GuestId, e.OccurredAt, e.Method, e.HasNote, e.IsCpnContact, e.Category, e.SessionNumber,
                    e.ActivityType, e.Occasion, e.AdviceType, e.IsAssessment,
                    g.GuestNumber,
                    GuestName = g.FirstName + " " + g.LastName,
                    LoggedByName = db.Users.Where(u => u.Id == e.LoggedByStaffId).Select(u => u.DisplayName).FirstOrDefault() ?? "Unknown",
                    AssignedCmhwName = db.Users.Where(u => u.Id == g.AssignedCmhwId).Select(u => u.DisplayName).FirstOrDefault(),
                })
            .Take(pageSize + 1)
            .ToListAsync(cancellationToken);

        var hasMore = rows.Count > pageSize;
        var page = rows.Take(pageSize)
            .Select(r => new ContactListRowDto(
                r.Id, r.GuestId, r.GuestNumber, r.GuestName,
                r.IsAssessment ? ContactListLabels.CpnAssessment
                    : r.HasNote ? ContactListLabels.NoteType(r.IsCpnContact, r.Category)
                    : ContactListLabels.Contact,
                r.HasNote
                    ? ContactListLabels.NoteDetail(r.IsCpnContact, r.Category, r.SessionNumber, r.ActivityType, r.Occasion, r.AdviceType)
                    : null,
                r.Method, r.OccurredAt, r.LoggedByName, r.AssignedCmhwName))
            .ToList();

        return new KeysetPage<ContactListRowDto>
        {
            Items = page,
            NextCursor = hasMore ? KeysetCursor.Encode(new ContactCursor(page[^1].OccurredAt, page[^1].Id)) : null,
            HasMore = hasMore,
            TotalCount = total,
        };
    }

    /// <summary>
    /// A tile list row before the guest and staff names are joined on. Notes, CPN assessments and
    /// bare contacts all project to this one shape, so the CPN list can union sessions with Part 1s.
    /// </summary>
    private sealed class ListEntry
    {
        public Guid Id { get; init; }
        public Guid GuestId { get; init; }
        public DateTimeOffset OccurredAt { get; init; }
        public ContactType Method { get; init; }
        public Guid LoggedByStaffId { get; init; }
        /// <summary>A submitted casework note backs the row; its CPN flag and category give the type.</summary>
        public bool HasNote { get; init; }
        public bool IsCpnContact { get; init; }
        public CaseworkNoteCategory? Category { get; init; }
        public int? SessionNumber { get; init; }
        public string? ActivityType { get; init; }
        public string? Occasion { get; init; }
        public string? AdviceType { get; init; }
        /// <summary>A CPN Part 1 — the assessment itself, or the contact its submission wrote.</summary>
        public bool IsAssessment { get; init; }
    }

    private static IQueryable<ListEntry> NoteEntries(IQueryable<CaseworkNote> notes) =>
        notes.Select(n => new ListEntry
        {
            Id = n.Id,
            GuestId = n.GuestId,
            OccurredAt = n.OccurredAt,
            Method = n.ContactMethod,
            LoggedByStaffId = n.AuthorStaffId,
            HasNote = true,
            IsCpnContact = n.IsCpnContact,
            Category = n.Category,
            SessionNumber = n.SessionNumber,
            ActivityType = n.ActivityType,
            Occasion = n.Occasion,
            AdviceType = n.AdviceType,
            IsAssessment = false,
        });

    private static IQueryable<ListEntry> AssessmentEntries(IQueryable<CpnInitialAssessment> assessments) =>
        assessments.Select(a => new ListEntry
        {
            Id = a.Id,
            GuestId = a.GuestId,
            OccurredAt = a.OccurredAt,
            Method = a.ContactMethod,
            LoggedByStaffId = a.AuthorStaffId,
            HasNote = false,
            IsCpnContact = true,
            Category = null,
            SessionNumber = null,
            ActivityType = null,
            Occasion = null,
            AdviceType = null,
            IsAssessment = true,
        });

    /// <summary>
    /// "Total contacts" rows: every contact, typed by the submitted note that wrote it (a plain left
    /// join — a note is submitted once and links the new contact it wrote, so it never repeats a
    /// row). A CPN Part 1 does not link its contact by id, so that contact is recognised by guest
    /// and time instead; a guest has at most one Part 1.
    /// </summary>
    private IQueryable<ListEntry> ContactEntries(IQueryable<Contact> contacts) =>
        from c in contacts
        from n in db.CaseworkNotes.Where(n => n.ContactId == c.Id).DefaultIfEmpty()
        select new ListEntry
        {
            Id = c.Id,
            GuestId = c.GuestId,
            OccurredAt = c.OccurredAt,
            Method = c.Type,
            LoggedByStaffId = c.CreatedByStaffId,
            HasNote = n != null,
            IsCpnContact = n != null && n.IsCpnContact,
            Category = n != null ? n.Category : null,
            SessionNumber = n != null ? n.SessionNumber : null,
            ActivityType = n != null ? n.ActivityType : null,
            Occasion = n != null ? n.Occasion : null,
            AdviceType = n != null ? n.AdviceType : null,
            IsAssessment = n == null && db.CpnInitialAssessments.Any(a => a.GuestId == c.GuestId
                && a.Status == CpnAssessmentStatus.Submitted && a.OccurredAt == c.OccurredAt),
        };

    /// <summary>
    /// The rows the stat tiles count for one caseload scope and date range. The tiles and their
    /// contact lists both read from here, so a list always holds exactly what its tile counts.
    /// </summary>
    private (IQueryable<Guest> Guests, IQueryable<CaseworkNote> Notes, IQueryable<CpnInitialAssessment> Assessments, IQueryable<Contact> Contacts)
        TileSources(Guid hubId, ContactsByGuestFilter filter)
    {
        var (fromTs, toTs) = Range(filter);
        var guests = ScopedGuests(hubId, filter);
        return (
            guests,
            SubmittedNotes(fromTs, toTs).Where(n => guests.Any(g => g.Id == n.GuestId)),
            SubmittedCpnAssessments(fromTs, toTs).Where(a => guests.Any(g => g.Id == a.GuestId)),
            ContactsInRange(fromTs, toTs).Where(c => guests.Any(g => g.Id == c.GuestId)));
    }

    /// <summary>
    /// The hub's guests in the screen's caseload scope: one CMHW's guests, or "My caseload" — the
    /// guests allocated to a staff member as their CMHW or through a confirmed CPN referral. A CPN
    /// is allocated by the MDT queue, never as the guest's CMHW, so without the referral a CPN's
    /// own caseload would read as empty.
    /// </summary>
    private IQueryable<Guest> ScopedGuests(Guid hubId, ContactsByGuestFilter filter)
    {
        var guests = db.Guests.AsNoTracking().Where(g => g.HubId == hubId && !g.IsDeleted);
        if (filter.AssignedCmhwId is not null)
        {
            guests = guests.Where(g => g.AssignedCmhwId == filter.AssignedCmhwId);
        }
        if (filter.CaseloadStaffId is { } staffId)
        {
            var cpnAllocations = db.MdtQueueItems.AsNoTracking()
                .Where(i => i.Kind == MdtQueueKind.CpnReferral && i.Status == MdtQueueStatus.Confirmed && i.AssignedCpnStaffId == staffId);
            guests = guests.Where(g => g.AssignedCmhwId == staffId || cpnAllocations.Any(i => i.GuestId == g.Id));
        }
        return guests;
    }

    /// <summary>Submitted casework notes in the range — a draft is not yet a contact (see CaseworkNote).</summary>
    private IQueryable<CaseworkNote> SubmittedNotes(DateTimeOffset? fromTs, DateTimeOffset? toTs) =>
        db.CaseworkNotes.AsNoTracking()
            .Where(n => n.Status == CaseworkNoteStatus.Submitted
                && (fromTs == null || n.OccurredAt >= fromTs) && (toTs == null || n.OccurredAt <= toTs));

    private IQueryable<Contact> ContactsInRange(DateTimeOffset? fromTs, DateTimeOffset? toTs) =>
        db.Contacts.AsNoTracking()
            .Where(c => (fromTs == null || c.OccurredAt >= fromTs) && (toTs == null || c.OccurredAt <= toTs));

    /// <summary>
    /// Submitted CPN Part 1 assessments in the range. Each one wrote its own Contact on
    /// submission, so it is CPN activity alongside the follow-up session notes.
    /// </summary>
    private IQueryable<CpnInitialAssessment> SubmittedCpnAssessments(DateTimeOffset? fromTs, DateTimeOffset? toTs) =>
        db.CpnInitialAssessments.AsNoTracking()
            .Where(a => a.Status == CpnAssessmentStatus.Submitted
                && (fromTs == null || a.OccurredAt >= fromTs) && (toTs == null || a.OccurredAt <= toTs));
}
