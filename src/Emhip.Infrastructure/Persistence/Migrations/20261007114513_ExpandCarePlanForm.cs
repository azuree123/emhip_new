using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Emhip.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExpandCarePlanForm : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The old free-text plan summary is kept as the plan's "other notes for the record".
            migrationBuilder.RenameColumn(
                name: "Summary",
                table: "CarePlans",
                newName: "OtherNotes");

            migrationBuilder.AddColumn<string>(
                name: "Referrals",
                table: "CarePlans",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BetweenSessions",
                table: "CarePlans",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "CpnInvolvementRequired",
                table: "CarePlans",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "NextContactOn",
                table: "CarePlans",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NhsReferral",
                table: "CarePlans",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BetweenSessions",
                table: "CarePlans");

            migrationBuilder.DropColumn(
                name: "CpnInvolvementRequired",
                table: "CarePlans");

            migrationBuilder.DropColumn(
                name: "NextContactOn",
                table: "CarePlans");

            migrationBuilder.DropColumn(
                name: "NhsReferral",
                table: "CarePlans");

            migrationBuilder.DropColumn(
                name: "Referrals",
                table: "CarePlans");

            migrationBuilder.RenameColumn(
                name: "OtherNotes",
                table: "CarePlans",
                newName: "Summary");
        }
    }
}
