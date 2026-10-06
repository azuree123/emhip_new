using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Emhip.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddContactTypeFieldsToCaseworkNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ActivityType",
                table: "CaseworkNotes",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AdviceType",
                table: "CaseworkNotes",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "NoNextContactRequired",
                table: "CaseworkNotes",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Occasion",
                table: "CaseworkNotes",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ActivityType",
                table: "CaseworkNotes");

            migrationBuilder.DropColumn(
                name: "AdviceType",
                table: "CaseworkNotes");

            migrationBuilder.DropColumn(
                name: "NoNextContactRequired",
                table: "CaseworkNotes");

            migrationBuilder.DropColumn(
                name: "Occasion",
                table: "CaseworkNotes");
        }
    }
}
