using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Emhip.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSpecComplianceStatusUrgencyReferralMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ImmediateRisk",
                table: "InitialConversationRecords",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateOnly>(
                name: "NextContactDate",
                table: "InitialConversationRecords",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsUrgent",
                table: "Guests",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastActivityAt",
                table: "Guests",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LegacyReference",
                table: "Guests",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReferralSubcategory",
                table: "Guests",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReferralType",
                table: "Guests",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UrgentSince",
                table: "Guests",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LivingGroup",
                table: "GuestDemographics",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MaritalStatus",
                table: "GuestDemographics",
                type: "nvarchar(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CaseloadAssignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GuestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FromStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ToStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    RecordedByStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecordedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CaseloadAssignments", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Guests_Hub_IsUrgent",
                table: "Guests",
                columns: new[] { "HubId", "IsUrgent" });

            migrationBuilder.CreateIndex(
                name: "IX_Guests_Hub_LegacyReference",
                table: "Guests",
                columns: new[] { "HubId", "LegacyReference" });

            migrationBuilder.CreateIndex(
                name: "IX_Guests_Hub_Status_LastActivity",
                table: "Guests",
                columns: new[] { "HubId", "Status", "LastActivityAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CaseloadAssignments_Guest_Recorded",
                table: "CaseloadAssignments",
                columns: new[] { "GuestId", "RecordedAt" });

            // --- Data conversion for the new status model (spec §3.3 / §4.7) ---------------
            // Existing rows carry the old vocabulary and encode urgency as a status. Urgency
            // becomes its own flag, so an escalated guest keeps the engagement status they
            // actually had; 'Urgent' rows land on Active because that is what they were before
            // being escalated (the old model had already overwritten the original value).
            migrationBuilder.Sql("UPDATE Guests SET IsUrgent = 1 WHERE Status = 'Urgent';");
            migrationBuilder.Sql("UPDATE Guests SET UrgentSince = SYSDATETIMEOFFSET() WHERE IsUrgent = 1 AND UrgentSince IS NULL;");
            migrationBuilder.Sql("UPDATE Guests SET Status = 'Active' WHERE Status = 'Urgent';");
            migrationBuilder.Sql("UPDATE Guests SET Status = 'New' WHERE Status = 'PendingConversation';");
            migrationBuilder.Sql("UPDATE Guests SET Status = 'OnHold' WHERE Status = 'Inactive';");

            // Guests already flagged in the urgent read model keep their flag even if their
            // status had drifted.
            migrationBuilder.Sql(@"
                UPDATE g SET g.IsUrgent = 1, g.UrgentSince = ISNULL(g.UrgentSince, u.EscalatedAt)
                FROM Guests g
                JOIN UrgentCases_ReadModel u ON u.GuestId = g.Id
                WHERE u.IsActive = 1;");

            // Backfill last activity from the contact history so the On Hold sweep has something
            // truthful to work from on its first run.
            migrationBuilder.Sql(@"
                UPDATE g SET g.LastActivityAt = lc.LastOccurredAt
                FROM Guests g
                CROSS APPLY (SELECT MAX(c.OccurredAt) AS LastOccurredAt FROM Contacts c WHERE c.GuestId = g.Id) lc
                WHERE lc.LastOccurredAt IS NOT NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE Guests SET Status = 'PendingConversation' WHERE Status = 'New';");
            migrationBuilder.Sql("UPDATE Guests SET Status = 'Inactive' WHERE Status = 'OnHold';");
            migrationBuilder.Sql("UPDATE Guests SET Status = 'Urgent' WHERE IsUrgent = 1;");

            migrationBuilder.DropTable(
                name: "CaseloadAssignments");

            migrationBuilder.DropIndex(
                name: "IX_Guests_Hub_IsUrgent",
                table: "Guests");

            migrationBuilder.DropIndex(
                name: "IX_Guests_Hub_LegacyReference",
                table: "Guests");

            migrationBuilder.DropIndex(
                name: "IX_Guests_Hub_Status_LastActivity",
                table: "Guests");

            migrationBuilder.DropColumn(
                name: "ImmediateRisk",
                table: "InitialConversationRecords");

            migrationBuilder.DropColumn(
                name: "NextContactDate",
                table: "InitialConversationRecords");

            migrationBuilder.DropColumn(
                name: "IsUrgent",
                table: "Guests");

            migrationBuilder.DropColumn(
                name: "LastActivityAt",
                table: "Guests");

            migrationBuilder.DropColumn(
                name: "LegacyReference",
                table: "Guests");

            migrationBuilder.DropColumn(
                name: "ReferralSubcategory",
                table: "Guests");

            migrationBuilder.DropColumn(
                name: "ReferralType",
                table: "Guests");

            migrationBuilder.DropColumn(
                name: "UrgentSince",
                table: "Guests");

            migrationBuilder.DropColumn(
                name: "LivingGroup",
                table: "GuestDemographics");

            migrationBuilder.DropColumn(
                name: "MaritalStatus",
                table: "GuestDemographics");
        }
    }
}
