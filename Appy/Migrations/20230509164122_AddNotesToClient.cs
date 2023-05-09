using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Appy.Migrations
{
    public partial class AddNotesToClient : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "Clients",
                type: "text",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Notes",
                table: "Clients");
        }
    }
}
