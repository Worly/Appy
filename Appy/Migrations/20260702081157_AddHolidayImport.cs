using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Appy.Migrations
{
    /// <inheritdoc />
    public partial class AddHolidayImport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ImportedHolidayId",
                table: "TimeOffs",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "HolidayImportSettings",
                columns: table => new
                {
                    FacilityId = table.Column<int>(type: "integer", nullable: false),
                    CountryCode = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HolidayImportSettings", x => x.FacilityId);
                    table.ForeignKey(
                        name: "FK_HolidayImportSettings_Facilities_FacilityId",
                        column: x => x.FacilityId,
                        principalTable: "Facilities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ImportedHolidays",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FacilityId = table.Column<int>(type: "integer", nullable: false),
                    CountryCode = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportedHolidays", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ImportedHolidays_Facilities_FacilityId",
                        column: x => x.FacilityId,
                        principalTable: "Facilities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TimeOffs_ImportedHolidayId",
                table: "TimeOffs",
                column: "ImportedHolidayId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportedHolidays_FacilityId",
                table: "ImportedHolidays",
                column: "FacilityId");

            migrationBuilder.AddForeignKey(
                name: "FK_TimeOffs_ImportedHolidays_ImportedHolidayId",
                table: "TimeOffs",
                column: "ImportedHolidayId",
                principalTable: "ImportedHolidays",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TimeOffs_ImportedHolidays_ImportedHolidayId",
                table: "TimeOffs");

            migrationBuilder.DropTable(
                name: "HolidayImportSettings");

            migrationBuilder.DropTable(
                name: "ImportedHolidays");

            migrationBuilder.DropIndex(
                name: "IX_TimeOffs_ImportedHolidayId",
                table: "TimeOffs");

            migrationBuilder.DropColumn(
                name: "ImportedHolidayId",
                table: "TimeOffs");
        }
    }
}
