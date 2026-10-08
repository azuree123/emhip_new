using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Emhip.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CaseworkNoteRiskCheckAndAfa : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "RiskNotes",
                table: "CaseworkNotes",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(2000)",
                oldMaxLength: 2000,
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AfaContactMethod",
                table: "CaseworkNotes",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompletedActionIds",
                table: "CaseworkNotes",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RiskCheck",
                table: "CaseworkNotes",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UrgentEpisodeId",
                table: "CaseworkNotes",
                type: "uniqueidentifier",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AfaContactMethod",
                table: "CaseworkNotes");

            migrationBuilder.DropColumn(
                name: "CompletedActionIds",
                table: "CaseworkNotes");

            migrationBuilder.DropColumn(
                name: "RiskCheck",
                table: "CaseworkNotes");

            migrationBuilder.DropColumn(
                name: "UrgentEpisodeId",
                table: "CaseworkNotes");

            migrationBuilder.AlterColumn<string>(
                name: "RiskNotes",
                table: "CaseworkNotes",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(4000)",
                oldMaxLength: 4000,
                oldNullable: true);
        }
    }
}
