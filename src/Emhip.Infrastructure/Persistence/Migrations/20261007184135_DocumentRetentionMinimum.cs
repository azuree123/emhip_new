using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Emhip.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class DocumentRetentionMinimum : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // NHS minimum for mental health records: no document may be purged within 8 years of
            // upload (Document.MinimumRetentionYears). Lift blank or shorter retention dates to that
            // floor so the date staff see is the date the system enforces.
            migrationBuilder.Sql("""
                UPDATE Documents
                SET RetainUntil = DATEADD(year, 8, CAST(CreatedAt AS date))
                WHERE RetainUntil IS NULL OR RetainUntil < DATEADD(year, 8, CAST(CreatedAt AS date));
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data-only: the previous (shorter or blank) dates are not kept, and lengthening a
            // retention period is the safe direction, so there is nothing to undo.
        }
    }
}
