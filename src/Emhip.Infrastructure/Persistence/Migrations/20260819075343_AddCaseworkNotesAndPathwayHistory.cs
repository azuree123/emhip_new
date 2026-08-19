using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Emhip.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCaseworkNotesAndPathwayHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CaseworkNotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GuestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Category = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ContactMethod = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    OccurredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Situation = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    Background = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    Assessment = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    Recommendation = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    RiskLevel = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    GuestReportedChanges = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ServiceInvolvementChanges = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    AdditionalNotes = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    NextContactDate = table.Column<DateOnly>(type: "date", nullable: true),
                    MdtDiscussionRequested = table.Column<bool>(type: "bit", nullable: false),
                    CpnReferralRequested = table.Column<bool>(type: "bit", nullable: false),
                    ContactId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AuthorStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    SubmittedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CaseworkNotes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PathwayChanges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GuestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FromPathway = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    ToPathway = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    AssignedByStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AssignedByName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ChangedOn = table.Column<DateOnly>(type: "date", nullable: false),
                    RecordedByStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PathwayChanges", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CaseworkNotes_AuthorStaffId_Status",
                table: "CaseworkNotes",
                columns: new[] { "AuthorStaffId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_CaseworkNotes_Guest_Occurred",
                table: "CaseworkNotes",
                columns: new[] { "GuestId", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PathwayChanges_Guest_ChangedOn",
                table: "PathwayChanges",
                columns: new[] { "GuestId", "ChangedOn" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CaseworkNotes");

            migrationBuilder.DropTable(
                name: "PathwayChanges");
        }
    }
}
