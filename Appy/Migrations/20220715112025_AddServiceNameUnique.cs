using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Appy.Migrations
{
    public partial class AddServiceNameUnique : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Services_FacilityId",
                table: "Services");

            migrationBuilder.CreateIndex(
                name: "IX_Services_FacilityId_Name",
                table: "Services",
                columns: new[] { "FacilityId", "Name" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Services_FacilityId_Name",
                table: "Services");

            migrationBuilder.CreateIndex(
                name: "IX_Services_FacilityId",
                table: "Services",
                column: "FacilityId");
        }
    }
}
