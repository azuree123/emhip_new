using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Emhip.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDialogActionsClinicalProfilePathway : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AfaSupportNeeded",
                table: "Guests",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Pathway",
                table: "Guests",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DialogAssessments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GuestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false),
                    AssessedByStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssessedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    MentalHealth = table.Column<int>(type: "int", nullable: false),
                    PhysicalHealth = table.Column<int>(type: "int", nullable: false),
                    JobSituation = table.Column<int>(type: "int", nullable: false),
                    Accommodation = table.Column<int>(type: "int", nullable: false),
                    LeisureActivities = table.Column<int>(type: "int", nullable: false),
                    FriendshipsSocialLife = table.Column<int>(type: "int", nullable: false),
                    RelationshipWithFamily = table.Column<int>(type: "int", nullable: false),
                    PersonalSafety = table.Column<int>(type: "int", nullable: false),
                    PracticalHelp = table.Column<int>(type: "int", nullable: false),
                    Medication = table.Column<int>(type: "int", nullable: false),
                    MeetingsWithMhStaff = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DialogAssessments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "GuestActions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GuestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: false),
                    AssignedToStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsCompleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GuestActions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "GuestClinicalProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GuestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PreviousMhDiagnosis = table.Column<bool>(type: "bit", nullable: false),
                    DiagnosisGroups = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PresentingProblem = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    PastMhDifficulties = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    FamilyMhHistory = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    LongTermHealthCondition = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    PhysicalIllness = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CurrentMedications = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    MhTeamClinician = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SocialServicesCoordinator = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CpnInvolved = table.Column<bool>(type: "bit", nullable: false),
                    TrustInvolvement = table.Column<bool>(type: "bit", nullable: false),
                    SmiIndicator = table.Column<bool>(type: "bit", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GuestClinicalProfiles", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DialogAssessments_GuestId_Version",
                table: "DialogAssessments",
                columns: new[] { "GuestId", "Version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GuestActions_GuestId_DueDate",
                table: "GuestActions",
                columns: new[] { "GuestId", "DueDate" });

            migrationBuilder.CreateIndex(
                name: "IX_GuestClinicalProfiles_GuestId",
                table: "GuestClinicalProfiles",
                column: "GuestId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DialogAssessments");

            migrationBuilder.DropTable(
                name: "GuestActions");

            migrationBuilder.DropTable(
                name: "GuestClinicalProfiles");

            migrationBuilder.DropColumn(
                name: "AfaSupportNeeded",
                table: "Guests");

            migrationBuilder.DropColumn(
                name: "Pathway",
                table: "Guests");
        }
    }
}
