using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Appy.Migrations
{
    public partial class RemoveClientNickname : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Set Name to first split of Nickname if Name is null or empty
            migrationBuilder.Sql("UPDATE \"Clients\" SET \"Name\" = trim(SPLIT_PART(\"Nickname\", ' ', 1)) WHERE \"Name\" IS NULL or trim(\"Name\") = '';");

            // Set Surname to second split of Nickname if Surname is null or empty
            migrationBuilder.Sql("UPDATE \"Clients\" SET \"Surname\" = nullif(trim(substring(\"Nickname\", (length(split_part(\"Nickname\", ' ', 1))) + 1)), '') WHERE \"Surname\" IS NULL or trim(\"Surname\") = '';");

            migrationBuilder.DropColumn(
                name: "Nickname",
                table: "Clients");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Clients",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Clients",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "Nickname",
                table: "Clients",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
