using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Emhip.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUrgentEpisodesGuestNumbers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "dbo");

            // Hand-written instead of the scaffolded CreateSequence/AddColumn pair: existing
            // guests are numbered in registration order starting at 1001 ("G-1001"), and the
            // sequence starts above the backfilled maximum so new registrations continue it.
            migrationBuilder.Sql("ALTER TABLE Guests ADD GuestNumber int NULL;");

            migrationBuilder.Sql("""
                WITH numbered AS (
                    SELECT Id, 1000 + ROW_NUMBER() OVER (ORDER BY RegisteredAt, Id) AS Number
                    FROM Guests
                )
                UPDATE g SET g.GuestNumber = numbered.Number
                FROM Guests g
                JOIN numbered ON numbered.Id = g.Id;
                """);

            migrationBuilder.Sql("""
                DECLARE @start bigint = (SELECT ISNULL(MAX(GuestNumber), 1000) + 1 FROM Guests);
                DECLARE @sql nvarchar(400) =
                    N'CREATE SEQUENCE dbo.GuestNumbers AS int START WITH ' + CAST(@start AS nvarchar(20)) + N' INCREMENT BY 1;';
                EXEC sp_executesql @sql;
                """);

            migrationBuilder.Sql("ALTER TABLE Guests ALTER COLUMN GuestNumber int NOT NULL;");

            migrationBuilder.Sql("ALTER TABLE Guests ADD CONSTRAINT DF_Guests_GuestNumber DEFAULT (NEXT VALUE FOR dbo.GuestNumbers) FOR GuestNumber;");

            migrationBuilder.AddColumn<string>(
                name: "ReferralSource",
                table: "Guests",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ExportRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    HubId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ExportedByStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ExportedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ExportType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    FromDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ToDate = table.Column<DateOnly>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExportRecords", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UrgentEpisodes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GuestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RaisedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    EscalatedToCmhtAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    EscalatedToCmhtByStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CmhtTeam = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    EscalationReason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    EscalationUrgency = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    EscalationNotes = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    ResolvedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ResolvedByStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ResolutionNote = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UrgentEpisodes", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Guests_GuestNumber",
                table: "Guests",
                column: "GuestNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExportRecords_HubId_ExportedAt",
                table: "ExportRecords",
                columns: new[] { "HubId", "ExportedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_UrgentEpisodes_GuestId_ResolvedAt",
                table: "UrgentEpisodes",
                columns: new[] { "GuestId", "ResolvedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_UrgentEpisodes_ResolvedAt",
                table: "UrgentEpisodes",
                column: "ResolvedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExportRecords");

            migrationBuilder.DropTable(
                name: "UrgentEpisodes");

            migrationBuilder.DropIndex(
                name: "IX_Guests_GuestNumber",
                table: "Guests");

            migrationBuilder.DropColumn(
                name: "GuestNumber",
                table: "Guests");

            migrationBuilder.DropColumn(
                name: "ReferralSource",
                table: "Guests");

            migrationBuilder.DropSequence(
                name: "GuestNumbers",
                schema: "dbo");
        }
    }
}
