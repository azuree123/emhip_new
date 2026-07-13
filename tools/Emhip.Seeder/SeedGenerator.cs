using System.Data;
using Bogus;
using Emhip.Domain.Enums;

namespace Emhip.Seeder;

/// <summary>
/// Builds DataTables of synthetic EMHIP data for SqlBulkCopy. Column sets mirror the EF Core
/// migration exactly (Emhip.Infrastructure/Persistence/Migrations) — server-generated columns
/// (Guests.RowVersion) are intentionally omitted.
/// </summary>
internal static class SeedGenerator
{
    public static DataTable BuildHubsTable(IReadOnlyList<(Guid Id, string Name, string Code)> hubs)
    {
        var table = new DataTable();
        table.Columns.Add("Id", typeof(Guid));
        table.Columns.Add("Name", typeof(string));
        table.Columns.Add("Code", typeof(string));

        foreach (var hub in hubs) table.Rows.Add(hub.Id, hub.Name, hub.Code);
        return table;
    }

    public static DataTable BuildStaffTable(IReadOnlyList<(Guid Id, Guid HubId, string DisplayName, string Email, StaffRole Role)> staff)
    {
        var table = new DataTable();
        table.Columns.Add("Id", typeof(Guid));
        table.Columns.Add("HubId", typeof(Guid));
        table.Columns.Add("DisplayName", typeof(string));
        table.Columns.Add("Email", typeof(string));
        table.Columns.Add("Role", typeof(string));

        foreach (var s in staff) table.Rows.Add(s.Id, s.HubId, s.DisplayName, s.Email, s.Role.ToString());
        return table;
    }

    public static (DataTable Table, List<(Guid Id, Guid HubId)> Guests) BuildGuestsTable(
        int count, Guid hubId, IReadOnlyList<Guid> staffIds, Faker faker, Random random)
    {
        var table = new DataTable();
        table.Columns.Add("Id", typeof(Guid));
        table.Columns.Add("HubId", typeof(Guid));
        table.Columns.Add("FirstName", typeof(string));
        table.Columns.Add("LastName", typeof(string));
        table.Columns.Add("DateOfBirth", typeof(DateTime));
        table.Columns.Add("Gender", typeof(string));
        table.Columns.Add("ContactPhone", typeof(string));
        table.Columns.Add("ContactEmail", typeof(string));
        table.Columns.Add("AddressLine1", typeof(string));
        table.Columns.Add("AddressLine2", typeof(string));
        table.Columns.Add("PostCode", typeof(string));
        table.Columns.Add("ConsentGiven", typeof(bool));
        table.Columns.Add("ConsentGivenAt", typeof(DateTimeOffset));
        table.Columns.Add("Status", typeof(string));
        table.Columns.Add("AssignedCmhwId", typeof(Guid));
        table.Columns.Add("RegisteredByStaffId", typeof(Guid));
        table.Columns.Add("RegisteredAt", typeof(DateTimeOffset));
        table.Columns.Add("IsDeleted", typeof(bool));

        var statuses = Enum.GetValues<GuestStatus>();
        var guests = new List<(Guid Id, Guid HubId)>(count);

        for (var i = 0; i < count; i++)
        {
            var id = Guid.NewGuid();
            var registeredAt = faker.Date.PastOffset(3);
            var assignedCmhw = staffIds[random.Next(staffIds.Count)];

            table.Rows.Add(
                id, hubId, faker.Name.FirstName(), faker.Name.LastName(),
                faker.Date.Past(70, DateTime.UtcNow.AddYears(-18)), faker.PickRandom("Female", "Male", "Non-binary", "Prefer not to say"),
                faker.Phone.PhoneNumber("07### ######"), faker.Internet.Email(),
                faker.Address.StreetAddress(), faker.Random.Bool(0.3f) ? faker.Address.SecondaryAddress() : DBNull.Value,
                faker.Address.ZipCode(), true, registeredAt,
                statuses[random.Next(statuses.Length)].ToString(),
                assignedCmhw, staffIds[random.Next(staffIds.Count)], registeredAt, false);

            guests.Add((id, hubId));
        }

        return (table, guests);
    }

    public static DataTable BuildContactsTable(IReadOnlyList<(Guid Id, Guid HubId)> guests, IReadOnlyList<Guid> staffIds, Faker faker, Random random, int perGuestMax)
    {
        var table = new DataTable();
        table.Columns.Add("Id", typeof(Guid));
        table.Columns.Add("GuestId", typeof(Guid));
        table.Columns.Add("Type", typeof(string));
        table.Columns.Add("Outcome", typeof(string));
        table.Columns.Add("OccurredAt", typeof(DateTimeOffset));
        table.Columns.Add("Notes", typeof(string));
        table.Columns.Add("CreatedByStaffId", typeof(Guid));
        table.Columns.Add("CreatedAt", typeof(DateTimeOffset));

        var types = Enum.GetValues<ContactType>();
        var outcomes = Enum.GetValues<ContactOutcome>();

        foreach (var guest in guests)
        {
            var contactCount = random.Next(0, perGuestMax + 1);
            for (var i = 0; i < contactCount; i++)
            {
                var occurredAt = faker.Date.PastOffset(2);
                table.Rows.Add(
                    Guid.NewGuid(), guest.Id, types[random.Next(types.Length)].ToString(), outcomes[random.Next(outcomes.Length)].ToString(),
                    occurredAt, faker.Lorem.Sentence(), staffIds[random.Next(staffIds.Count)], occurredAt);
            }
        }

        return table;
    }

    public static DataTable BuildNotesTable(IReadOnlyList<(Guid Id, Guid HubId)> guests, IReadOnlyList<Guid> staffIds, Faker faker, Random random, int perGuestMax)
    {
        var table = new DataTable();
        table.Columns.Add("Id", typeof(Guid));
        table.Columns.Add("GuestId", typeof(Guid));
        table.Columns.Add("AuthorStaffId", typeof(Guid));
        table.Columns.Add("Body", typeof(string));
        table.Columns.Add("Color", typeof(string));
        table.Columns.Add("IsPinned", typeof(bool));
        table.Columns.Add("CreatedAt", typeof(DateTimeOffset));

        var colors = Enum.GetValues<NoteColor>();

        foreach (var guest in guests)
        {
            var noteCount = random.Next(0, perGuestMax + 1);
            for (var i = 0; i < noteCount; i++)
            {
                table.Rows.Add(
                    Guid.NewGuid(), guest.Id, staffIds[random.Next(staffIds.Count)], faker.Lorem.Sentences(2),
                    colors[random.Next(colors.Length)].ToString(), random.NextDouble() < 0.2, faker.Date.PastOffset(1));
            }
        }

        return table;
    }

    public static DataTable BuildRiskAssessmentsTable(IReadOnlyList<(Guid Id, Guid HubId)> guests, IReadOnlyList<Guid> staffIds, Faker faker, Random random)
    {
        var table = new DataTable();
        table.Columns.Add("Id", typeof(Guid));
        table.Columns.Add("GuestId", typeof(Guid));
        table.Columns.Add("Version", typeof(int));
        table.Columns.Add("SuicidalIdeation", typeof(bool));
        table.Columns.Add("SelfHarm", typeof(bool));
        table.Columns.Add("RiskToOthers", typeof(bool));
        table.Columns.Add("SevereDeterioration", typeof(bool));
        table.Columns.Add("SafeguardingConcern", typeof(bool));
        table.Columns.Add("Notes", typeof(string));
        table.Columns.Add("AssessedByStaffId", typeof(Guid));
        table.Columns.Add("AssessedAt", typeof(DateTimeOffset));

        foreach (var guest in guests)
        {
            // ~15% of guests have at least one (versioned) risk assessment on file.
            if (random.NextDouble() > 0.15) continue;

            var versions = random.Next(1, 3);
            for (var v = 1; v <= versions; v++)
            {
                table.Rows.Add(
                    Guid.NewGuid(), guest.Id, v,
                    random.NextDouble() < 0.3, random.NextDouble() < 0.2, random.NextDouble() < 0.1,
                    random.NextDouble() < 0.15, random.NextDouble() < 0.1,
                    faker.Lorem.Sentence(), staffIds[random.Next(staffIds.Count)], faker.Date.PastOffset(1));
            }
        }

        return table;
    }

    public static DataTable BuildFollowUpsTable(IReadOnlyList<(Guid Id, Guid HubId)> guests, IReadOnlyList<Guid> staffIds, Faker faker, Random random, int perGuestMax)
    {
        var table = new DataTable();
        table.Columns.Add("Id", typeof(Guid));
        table.Columns.Add("GuestId", typeof(Guid));
        table.Columns.Add("DueDate", typeof(DateTime));
        table.Columns.Add("AssigneeStaffId", typeof(Guid));
        table.Columns.Add("Status", typeof(string));
        table.Columns.Add("Notes", typeof(string));
        table.Columns.Add("CreatedAt", typeof(DateTimeOffset));
        table.Columns.Add("CompletedAt", typeof(DateTimeOffset));

        var statuses = Enum.GetValues<FollowUpStatus>();

        foreach (var guest in guests)
        {
            var count = random.Next(0, perGuestMax + 1);
            for (var i = 0; i < count; i++)
            {
                var status = statuses[random.Next(statuses.Length)];
                var dueDate = faker.Date.Between(DateTime.UtcNow.AddMonths(-2), DateTime.UtcNow.AddMonths(2));
                table.Rows.Add(
                    Guid.NewGuid(), guest.Id, dueDate.Date, staffIds[random.Next(staffIds.Count)], status.ToString(),
                    faker.Lorem.Sentence(), faker.Date.PastOffset(1),
                    status == FollowUpStatus.Completed ? faker.Date.PastOffset(1) : (object)DBNull.Value);
            }
        }

        return table;
    }

    public static DataTable BuildPathwayReferralsTable(IReadOnlyList<(Guid Id, Guid HubId)> guests, IReadOnlyList<Guid> staffIds, Faker faker, Random random, int perGuestMax)
    {
        var table = new DataTable();
        table.Columns.Add("Id", typeof(Guid));
        table.Columns.Add("GuestId", typeof(Guid));
        table.Columns.Add("Category", typeof(string));
        table.Columns.Add("Detail", typeof(string));
        table.Columns.Add("Status", typeof(string));
        table.Columns.Add("ReferredByStaffId", typeof(Guid));
        table.Columns.Add("ReferredAt", typeof(DateTimeOffset));

        var categories = Enum.GetValues<PathwayCategory>();
        var statuses = Enum.GetValues<PathwayStatus>();

        foreach (var guest in guests)
        {
            var count = random.Next(0, perGuestMax + 1);
            for (var i = 0; i < count; i++)
            {
                table.Rows.Add(
                    Guid.NewGuid(), guest.Id, categories[random.Next(categories.Length)].ToString(), faker.Lorem.Sentence(),
                    statuses[random.Next(statuses.Length)].ToString(), staffIds[random.Next(staffIds.Count)], faker.Date.PastOffset(2));
            }
        }

        return table;
    }

    public static DataTable BuildAuditEventsTable(IReadOnlyList<(Guid Id, Guid HubId)> guests, IReadOnlyList<Guid> staffIds, Faker faker, Random random, int perGuestMax)
    {
        var table = new DataTable();
        table.Columns.Add("Id", typeof(Guid));
        table.Columns.Add("GuestId", typeof(Guid));
        table.Columns.Add("ActorStaffId", typeof(Guid));
        table.Columns.Add("Action", typeof(string));
        table.Columns.Add("EntityName", typeof(string));
        table.Columns.Add("EntityId", typeof(string));
        table.Columns.Add("Details", typeof(string));
        table.Columns.Add("OccurredAt", typeof(DateTimeOffset));

        var actions = Enum.GetValues<AuditAction>();

        foreach (var guest in guests)
        {
            var count = random.Next(1, perGuestMax + 1);
            for (var i = 0; i < count; i++)
            {
                table.Rows.Add(
                    Guid.NewGuid(), guest.Id, staffIds[random.Next(staffIds.Count)], actions[random.Next(actions.Length)].ToString(),
                    "Guest", guest.Id.ToString(), DBNull.Value, faker.Date.PastOffset(2));
            }
        }

        return table;
    }
}
