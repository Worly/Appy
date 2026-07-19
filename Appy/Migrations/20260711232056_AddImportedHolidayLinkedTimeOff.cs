using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Appy.Migrations
{
    /// <inheritdoc />
    public partial class AddImportedHolidayLinkedTimeOff : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TimeOffs_ImportedHolidayId",
                table: "TimeOffs");

            migrationBuilder.CreateIndex(
                name: "IX_TimeOffs_ImportedHolidayId",
                table: "TimeOffs",
                column: "ImportedHolidayId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TimeOffs_ImportedHolidayId",
                table: "TimeOffs");

            migrationBuilder.CreateIndex(
                name: "IX_TimeOffs_ImportedHolidayId",
                table: "TimeOffs",
                column: "ImportedHolidayId");
        }
    }
}
