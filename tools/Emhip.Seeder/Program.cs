// Generates a large synthetic EMHIP dataset via SqlBulkCopy, demonstrating the "large-dataset
// capabilities" called out in ARCHITECTURE.md. Run against an empty, migrated database:
//
//   dotnet run --project tools/Emhip.Seeder -- \
//     --connection "Server=(local);Database=Emhip;Trusted_Connection=True;TrustServerCertificate=True;" \
//     --guests 100000 --hubs 3
//
// Applies EF Core migrations first if you haven't:
//   dotnet ef database update --project src/Emhip.Infrastructure --startup-project src/Emhip.Infrastructure

using Bogus;
using Emhip.Domain.Enums;
using Emhip.Seeder;
using Microsoft.Data.SqlClient;

var options = SeedOptions.Parse(args);
Console.WriteLine($"Seeding {options.GuestsPerHub:N0} guests x {options.HubCount} hub(s) -> {options.ConnectionString}");

var stopwatch = System.Diagnostics.Stopwatch.StartNew();
var random = new Random(42);
var faker = new Faker("en");

await using var connection = new SqlConnection(options.ConnectionString);
await connection.OpenAsync();

var hubs = Enumerable.Range(1, options.HubCount)
    .Select(i => (Id: Guid.NewGuid(), Name: $"{faker.Address.City()} Community Hub", Code: $"HUB{i:000}"))
    .ToList();

await BulkCopyHelper.WriteAsync(connection, "Hubs", SeedGenerator.BuildHubsTable(hubs));
Console.WriteLine($"Inserted {hubs.Count} hubs.");

foreach (var hub in hubs)
{
    var staff = Enumerable.Range(0, options.StaffPerHub)
        .Select(i => (
            Id: Guid.NewGuid(), HubId: hub.Id, DisplayName: faker.Name.FullName(),
            Email: faker.Internet.Email().ToLowerInvariant(),
            Role: i == 0 ? StaffRole.HubManager : StaffRole.Cmhw))
        .ToList();

    await BulkCopyHelper.WriteAsync(connection, "StaffMembers", SeedGenerator.BuildStaffTable(staff));
    var staffIds = staff.Select(s => s.Id).ToList();

    Console.WriteLine($"[{hub.Code}] Inserted {staff.Count} staff members.");

    var remaining = options.GuestsPerHub;
    var batchNumber = 0;
    while (remaining > 0)
    {
        var batchSize = Math.Min(options.BatchSize, remaining);
        remaining -= batchSize;
        batchNumber++;

        var (guestsTable, guestKeys) = SeedGenerator.BuildGuestsTable(batchSize, hub.Id, staffIds, faker, random);
        await BulkCopyHelper.WriteAsync(connection, "Guests", guestsTable);

        await BulkCopyHelper.WriteAsync(connection, "Contacts", SeedGenerator.BuildContactsTable(guestKeys, staffIds, faker, random, perGuestMax: 12));
        await BulkCopyHelper.WriteAsync(connection, "Notes", SeedGenerator.BuildNotesTable(guestKeys, staffIds, faker, random, perGuestMax: 4));
        await BulkCopyHelper.WriteAsync(connection, "RiskAssessments", SeedGenerator.BuildRiskAssessmentsTable(guestKeys, staffIds, faker, random));
        await BulkCopyHelper.WriteAsync(connection, "FollowUps", SeedGenerator.BuildFollowUpsTable(guestKeys, staffIds, faker, random, perGuestMax: 3));
        await BulkCopyHelper.WriteAsync(connection, "PathwayReferrals", SeedGenerator.BuildPathwayReferralsTable(guestKeys, staffIds, faker, random, perGuestMax: 2));
        await BulkCopyHelper.WriteAsync(connection, "AuditEvents", SeedGenerator.BuildAuditEventsTable(guestKeys, staffIds, faker, random, perGuestMax: 8));

        Console.WriteLine($"[{hub.Code}] Batch {batchNumber}: {batchSize:N0} guests + related rows ({stopwatch.Elapsed:mm\\:ss} elapsed).");
    }
}

Console.WriteLine($"Done in {stopwatch.Elapsed:mm\\:ss}.");

internal sealed record SeedOptions(string ConnectionString, int HubCount, int StaffPerHub, int GuestsPerHub, int BatchSize)
{
    public static SeedOptions Parse(string[] args)
    {
        string? connection = null;
        var hubs = 3;
        var staffPerHub = 8;
        var guestsPerHub = 20_000;
        var batchSize = 5_000;

        for (var i = 0; i < args.Length; i++)
        {
            switch (args[i])
            {
                case "--connection" when i + 1 < args.Length: connection = args[++i]; break;
                case "--hubs" when i + 1 < args.Length: hubs = int.Parse(args[++i]); break;
                case "--staff-per-hub" when i + 1 < args.Length: staffPerHub = int.Parse(args[++i]); break;
                case "--guests" when i + 1 < args.Length: guestsPerHub = int.Parse(args[++i]); break;
                case "--batch-size" when i + 1 < args.Length: batchSize = int.Parse(args[++i]); break;
            }
        }

        connection ??= Environment.GetEnvironmentVariable("EMHIP_CONNECTION")
            ?? "Server=(local);Database=Emhip;Trusted_Connection=True;TrustServerCertificate=True;";

        return new SeedOptions(connection, hubs, staffPerHub, guestsPerHub, batchSize);
    }
}
