using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Appy.Migrations
{
    public partial class AddAppointmentReminder : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AppointmentReminderMessageTemplate",
                table: "ClientNotificationsSettings",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "AppointmentReminderTime",
                table: "ClientNotificationsSettings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "WasReminded",
                table: "Appointments",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AppointmentReminderMessageTemplate",
                table: "ClientNotificationsSettings");

            migrationBuilder.DropColumn(
                name: "AppointmentReminderTime",
                table: "ClientNotificationsSettings");

            migrationBuilder.DropColumn(
                name: "WasReminded",
                table: "Appointments");
        }
    }
}
