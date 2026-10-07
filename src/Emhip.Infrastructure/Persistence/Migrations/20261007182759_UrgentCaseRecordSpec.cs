using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Emhip.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UrgentCaseRecordSpec : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "EscalationNotes",
                table: "UrgentEpisodes",
                newName: "CmhtCallNotes");

            migrationBuilder.RenameColumn(
                name: "EscalatedToCmhtByStaffId",
                table: "UrgentEpisodes",
                newName: "CmhtRecordedByStaffId");

            migrationBuilder.RenameColumn(
                name: "EscalatedToCmhtAt",
                table: "UrgentEpisodes",
                newName: "CmhtRecordedAt");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CmhtCalledAt",
                table: "UrgentEpisodes",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CmhtContactName",
                table: "UrgentEpisodes",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "CmhtNotified",
                table: "UrgentEpisodes",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalServicesInvolved",
                table: "UrgentEpisodes",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            // "Escalate to CMHT" is replaced by a hand-written record of the call. Carry existing
            // escalations across as "CMHT notified = Yes", called at the time they were sent, with
            // the old reason and urgency kept at the top of the call notes before those columns go.
            // EXEC defers compilation, so this also runs inside a single generated script batch.
            migrationBuilder.Sql("""
                EXEC(N'UPDATE UrgentEpisodes SET
                    CmhtNotified = 1,
                    CmhtCalledAt = CmhtRecordedAt,
                    CmhtCallNotes = NULLIF(LEFT(CONCAT_WS(CHAR(10),
                        CASE WHEN EscalationReason IS NOT NULL THEN CONCAT(N''Reason: '', EscalationReason) END,
                        CASE WHEN EscalationUrgency IS NOT NULL THEN CONCAT(N''Urgency: '', EscalationUrgency) END,
                        CmhtCallNotes), 4000), N'''')
                WHERE CmhtRecordedAt IS NOT NULL');
                """);

            migrationBuilder.DropColumn(
                name: "EscalationReason",
                table: "UrgentEpisodes");

            migrationBuilder.DropColumn(
                name: "EscalationUrgency",
                table: "UrgentEpisodes");

            migrationBuilder.AddColumn<bool>(
                name: "OtherRisk",
                table: "UrgentCases_ReadModel",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "OtherRiskDetails",
                table: "UrgentCases_ReadModel",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "OtherRisk",
                table: "RiskAssessments",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "OtherRiskDetails",
                table: "RiskAssessments",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_CaseworkNotes_ContactId",
                table: "CaseworkNotes",
                column: "ContactId");

            // The Urgent Cases dashboard now only acts through the Urgent Case Record, which needs a
            // case row. Guests still urgent from before case tracking (no open row) get one, dated
            // from when they became urgent and linked to their latest flagged risk assessment.
            migrationBuilder.Sql("""
                INSERT INTO UrgentEpisodes (Id, GuestId, RaisedAt, RaisedByStaffId, RiskAssessmentId, PathwayAtFlag, AssignedCmhwIdAtFlag, InpatientAdmission)
                SELECT NEWID(), g.Id, COALESCE(g.UrgentSince, u.EscalatedAt, SYSDATETIMEOFFSET()),
                       r.AssessedByStaffId, r.Id, g.Pathway, g.AssignedCmhwId, 0
                FROM Guests g
                LEFT JOIN UrgentCases_ReadModel u ON u.GuestId = g.Id AND u.IsActive = 1
                OUTER APPLY (
                    SELECT TOP 1 ra.Id, ra.AssessedByStaffId FROM RiskAssessments ra
                    WHERE ra.GuestId = g.Id
                      AND (ra.SuicidalIdeation = 1 OR ra.SelfHarm = 1 OR ra.RiskToOthers = 1 OR ra.SevereDeterioration = 1 OR ra.SafeguardingConcern = 1)
                    ORDER BY ra.AssessedAt DESC
                ) r
                WHERE (g.IsUrgent = 1 OR u.GuestId IS NOT NULL)
                  AND NOT EXISTS (SELECT 1 FROM UrgentEpisodes e WHERE e.GuestId = g.Id AND e.ResolvedAt IS NULL);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CaseworkNotes_ContactId",
                table: "CaseworkNotes");

            migrationBuilder.DropColumn(
                name: "CmhtCalledAt",
                table: "UrgentEpisodes");

            migrationBuilder.DropColumn(
                name: "CmhtContactName",
                table: "UrgentEpisodes");

            migrationBuilder.DropColumn(
                name: "CmhtNotified",
                table: "UrgentEpisodes");

            migrationBuilder.DropColumn(
                name: "ExternalServicesInvolved",
                table: "UrgentEpisodes");

            migrationBuilder.DropColumn(
                name: "OtherRisk",
                table: "UrgentCases_ReadModel");

            migrationBuilder.DropColumn(
                name: "OtherRiskDetails",
                table: "UrgentCases_ReadModel");

            migrationBuilder.DropColumn(
                name: "OtherRisk",
                table: "RiskAssessments");

            migrationBuilder.DropColumn(
                name: "OtherRiskDetails",
                table: "RiskAssessments");

            migrationBuilder.RenameColumn(
                name: "CmhtRecordedByStaffId",
                table: "UrgentEpisodes",
                newName: "EscalatedToCmhtByStaffId");

            migrationBuilder.RenameColumn(
                name: "CmhtRecordedAt",
                table: "UrgentEpisodes",
                newName: "EscalatedToCmhtAt");

            migrationBuilder.RenameColumn(
                name: "CmhtCallNotes",
                table: "UrgentEpisodes",
                newName: "EscalationNotes");

            migrationBuilder.AddColumn<string>(
                name: "EscalationReason",
                table: "UrgentEpisodes",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EscalationUrgency",
                table: "UrgentEpisodes",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);
        }
    }
}
