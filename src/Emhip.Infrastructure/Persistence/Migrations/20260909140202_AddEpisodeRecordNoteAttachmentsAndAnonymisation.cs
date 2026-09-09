using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Emhip.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddEpisodeRecordNoteAttachmentsAndAnonymisation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AssignedCmhwIdAtFlag",
                table: "UrgentEpisodes",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CmhwAfterResolutionStaffId",
                table: "UrgentEpisodes",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "InpatientAdmission",
                table: "UrgentEpisodes",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateOnly>(
                name: "NextContactDate",
                table: "UrgentEpisodes",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PathwayAfterResolution",
                table: "UrgentEpisodes",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PathwayAtFlag",
                table: "UrgentEpisodes",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RaisedByStaffId",
                table: "UrgentEpisodes",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RiskAssessmentId",
                table: "UrgentEpisodes",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SessionFrequencyChange",
                table: "UrgentEpisodes",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AnonymisedAt",
                table: "Guests",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsAnonymised",
                table: "Guests",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "CaseworkNoteId",
                table: "Documents",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Documents_CaseworkNoteId",
                table: "Documents",
                column: "CaseworkNoteId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Documents_CaseworkNoteId",
                table: "Documents");

            migrationBuilder.DropColumn(
                name: "AssignedCmhwIdAtFlag",
                table: "UrgentEpisodes");

            migrationBuilder.DropColumn(
                name: "CmhwAfterResolutionStaffId",
                table: "UrgentEpisodes");

            migrationBuilder.DropColumn(
                name: "InpatientAdmission",
                table: "UrgentEpisodes");

            migrationBuilder.DropColumn(
                name: "NextContactDate",
                table: "UrgentEpisodes");

            migrationBuilder.DropColumn(
                name: "PathwayAfterResolution",
                table: "UrgentEpisodes");

            migrationBuilder.DropColumn(
                name: "PathwayAtFlag",
                table: "UrgentEpisodes");

            migrationBuilder.DropColumn(
                name: "RaisedByStaffId",
                table: "UrgentEpisodes");

            migrationBuilder.DropColumn(
                name: "RiskAssessmentId",
                table: "UrgentEpisodes");

            migrationBuilder.DropColumn(
                name: "SessionFrequencyChange",
                table: "UrgentEpisodes");

            migrationBuilder.DropColumn(
                name: "AnonymisedAt",
                table: "Guests");

            migrationBuilder.DropColumn(
                name: "IsAnonymised",
                table: "Guests");

            migrationBuilder.DropColumn(
                name: "CaseworkNoteId",
                table: "Documents");
        }
    }
}
