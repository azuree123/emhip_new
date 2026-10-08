using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Emhip.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class GuestHeardAboutUs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "HeardAboutUs",
                table: "Guests",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "HeardAboutUsOther",
                table: "Guests",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HeardAboutUs",
                table: "Guests");

            migrationBuilder.DropColumn(
                name: "HeardAboutUsOther",
                table: "Guests");
        }
    }
}
