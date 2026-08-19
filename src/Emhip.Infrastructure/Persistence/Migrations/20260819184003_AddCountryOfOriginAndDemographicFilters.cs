using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Emhip.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCountryOfOriginAndDemographicFilters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CountryOfOrigin",
                table: "GuestDemographics",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_GuestDemographics_CountryOfOrigin",
                table: "GuestDemographics",
                column: "CountryOfOrigin");

            migrationBuilder.CreateIndex(
                name: "IX_GuestDemographics_Ethnicity",
                table: "GuestDemographics",
                column: "Ethnicity");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_GuestDemographics_CountryOfOrigin",
                table: "GuestDemographics");

            migrationBuilder.DropIndex(
                name: "IX_GuestDemographics_Ethnicity",
                table: "GuestDemographics");

            migrationBuilder.DropColumn(
                name: "CountryOfOrigin",
                table: "GuestDemographics");
        }
    }
}
