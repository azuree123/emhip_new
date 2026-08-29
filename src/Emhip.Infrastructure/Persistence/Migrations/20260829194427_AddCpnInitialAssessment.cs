using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Emhip.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCpnInitialAssessment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Category",
                table: "CaseworkNotes",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20);

            migrationBuilder.AddColumn<string>(
                name: "CpnSessionType",
                table: "CaseworkNotes",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsCpnContact",
                table: "CaseworkNotes",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "RiskNotes",
                table: "CaseworkNotes",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SessionNumber",
                table: "CaseworkNotes",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CpnInitialAssessments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GuestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ContactMethod = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    OccurredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    MethodOfAssessment = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    OthersPresent = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    ReasonForReferral = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    ReferredBy = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    CurrentDiagnosis = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    DiagnosisDetail = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CurrentMedication = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    PreviousPresentations = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    PreviousInpatientAdmission = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    PreviousMhaSection = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    TalkingTherapies = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    PersonalHistory = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    FamilyMentalIllness = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    AppearanceAndBehaviour = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Speech = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    MoodSubjective = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    MoodObjective = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Affect = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ThoughtsFormAndContent = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Perceptions = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Cognition = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Insight = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    EnergyAndSleep = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Appetite = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    SocialIsolation = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    SubstanceUse = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    SocialCircumstances = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    CapacityToConsent = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CapacityNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    OverallRiskRating = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ClinicalFormulation = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    RecommendedPlan = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    SafetyPlan = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    FollowUpFrequency = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    NextAppointmentDate = table.Column<DateOnly>(type: "date", nullable: true),
                    AuthorStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    SubmittedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CpnInitialAssessments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CpnRiskDomainRatings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssessmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Domain = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Rating = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CpnRiskDomainRatings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CpnRiskDomainRatings_CpnInitialAssessments_AssessmentId",
                        column: x => x.AssessmentId,
                        principalTable: "CpnInitialAssessments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CpnInitialAssessments_Guest",
                table: "CpnInitialAssessments",
                column: "GuestId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CpnRiskDomainRatings_AssessmentId_Domain",
                table: "CpnRiskDomainRatings",
                columns: new[] { "AssessmentId", "Domain" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CpnRiskDomainRatings");

            migrationBuilder.DropTable(
                name: "CpnInitialAssessments");

            migrationBuilder.DropColumn(
                name: "CpnSessionType",
                table: "CaseworkNotes");

            migrationBuilder.DropColumn(
                name: "IsCpnContact",
                table: "CaseworkNotes");

            migrationBuilder.DropColumn(
                name: "RiskNotes",
                table: "CaseworkNotes");

            migrationBuilder.DropColumn(
                name: "SessionNumber",
                table: "CaseworkNotes");

            migrationBuilder.AlterColumn<string>(
                name: "Category",
                table: "CaseworkNotes",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20,
                oldNullable: true);
        }
    }
}
