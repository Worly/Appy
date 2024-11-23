using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Appy.Migrations
{
    public partial class AddOrderToClientContact : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Order",
                table: "ClientContact",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Order",
                table: "ClientContact");
        }
    }
}
