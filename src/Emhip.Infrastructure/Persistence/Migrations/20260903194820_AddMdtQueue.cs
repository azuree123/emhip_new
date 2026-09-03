using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Emhip.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMdtQueue : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MdtQueueItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GuestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    RequestedByStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequestedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Details = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    Urgency = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SourceNoteId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewedByStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ReviewNote = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    AssignedCpnStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeclineReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MdtQueueItems", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MdtQueueItems_Guest_Kind_Status",
                table: "MdtQueueItems",
                columns: new[] { "GuestId", "Kind", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_MdtQueueItems_Status_RequestedAt",
                table: "MdtQueueItems",
                columns: new[] { "Status", "RequestedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MdtQueueItems");
        }
    }
}
