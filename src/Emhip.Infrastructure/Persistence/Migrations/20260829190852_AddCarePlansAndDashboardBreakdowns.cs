using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Emhip.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCarePlansAndDashboardBreakdowns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DataQualityJson",
                table: "DashboardSnapshots_ReadModel",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DemographicsJson",
                table: "DashboardSnapshots_ReadModel",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "CarePlanGoals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CarePlanId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    TargetDate = table.Column<DateOnly>(type: "date", nullable: true),
                    ProgressNote = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CarePlanGoals", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CarePlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GuestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    GuestVoice = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    SupportArrangements = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    StartedOn = table.Column<DateOnly>(type: "date", nullable: false),
                    ReviewDueOn = table.Column<DateOnly>(type: "date", nullable: true),
                    ClosedOn = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedByStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CarePlans", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CarePlanGoals_CarePlanId_SortOrder",
                table: "CarePlanGoals",
                columns: new[] { "CarePlanId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_CarePlans_Guest_Status",
                table: "CarePlans",
                columns: new[] { "GuestId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CarePlanGoals");

            migrationBuilder.DropTable(
                name: "CarePlans");

            migrationBuilder.DropColumn(
                name: "DataQualityJson",
                table: "DashboardSnapshots_ReadModel");

            migrationBuilder.DropColumn(
                name: "DemographicsJson",
                table: "DashboardSnapshots_ReadModel");
        }
    }
}
