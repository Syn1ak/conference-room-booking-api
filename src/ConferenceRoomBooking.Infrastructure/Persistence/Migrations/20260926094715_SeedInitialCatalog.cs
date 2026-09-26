using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ConferenceRoomBooking.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SeedInitialCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Rooms",
                columns: new[] { "Id", "Capacity", "HourlyPrice", "Name" },
                values: new object[,]
                {
                    { new Guid("046b6271-5db7-4729-a09a-dc6d0ded15de"), 50, 2000m, "Room A" },
                    { new Guid("819515e4-aae1-42d5-b99d-e52dae949c5b"), 30, 1500m, "Room C" },
                    { new Guid("be95fc4b-2368-4d36-9852-bb15c0c0be77"), 100, 3500m, "Room B" }
                });

            migrationBuilder.InsertData(
                table: "Services",
                columns: new[] { "Id", "Name", "StandardPrice" },
                values: new object[,]
                {
                    { new Guid("201ec157-075f-4f54-9303-ce07cbaf97cb"), "Wi-Fi", 300m },
                    { new Guid("43ad914e-33df-4222-9ef7-609a1978be69"), "Projector", 500m },
                    { new Guid("f2b39118-e101-4525-bfad-0191703b893f"), "Sound", 700m }
                });

            migrationBuilder.InsertData(
                table: "RoomServices",
                columns: new[] { "RoomId", "ServiceId", "Price" },
                values: new object[,]
                {
                    { new Guid("046b6271-5db7-4729-a09a-dc6d0ded15de"), new Guid("201ec157-075f-4f54-9303-ce07cbaf97cb"), 300m },
                    { new Guid("046b6271-5db7-4729-a09a-dc6d0ded15de"), new Guid("43ad914e-33df-4222-9ef7-609a1978be69"), 500m },
                    { new Guid("046b6271-5db7-4729-a09a-dc6d0ded15de"), new Guid("f2b39118-e101-4525-bfad-0191703b893f"), 700m },
                    { new Guid("819515e4-aae1-42d5-b99d-e52dae949c5b"), new Guid("201ec157-075f-4f54-9303-ce07cbaf97cb"), 300m },
                    { new Guid("819515e4-aae1-42d5-b99d-e52dae949c5b"), new Guid("43ad914e-33df-4222-9ef7-609a1978be69"), 500m },
                    { new Guid("819515e4-aae1-42d5-b99d-e52dae949c5b"), new Guid("f2b39118-e101-4525-bfad-0191703b893f"), 700m },
                    { new Guid("be95fc4b-2368-4d36-9852-bb15c0c0be77"), new Guid("201ec157-075f-4f54-9303-ce07cbaf97cb"), 300m },
                    { new Guid("be95fc4b-2368-4d36-9852-bb15c0c0be77"), new Guid("43ad914e-33df-4222-9ef7-609a1978be69"), 500m },
                    { new Guid("be95fc4b-2368-4d36-9852-bb15c0c0be77"), new Guid("f2b39118-e101-4525-bfad-0191703b893f"), 700m }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "RoomServices",
                keyColumns: new[] { "RoomId", "ServiceId" },
                keyValues: new object[] { new Guid("046b6271-5db7-4729-a09a-dc6d0ded15de"), new Guid("201ec157-075f-4f54-9303-ce07cbaf97cb") });

            migrationBuilder.DeleteData(
                table: "RoomServices",
                keyColumns: new[] { "RoomId", "ServiceId" },
                keyValues: new object[] { new Guid("046b6271-5db7-4729-a09a-dc6d0ded15de"), new Guid("43ad914e-33df-4222-9ef7-609a1978be69") });

            migrationBuilder.DeleteData(
                table: "RoomServices",
                keyColumns: new[] { "RoomId", "ServiceId" },
                keyValues: new object[] { new Guid("046b6271-5db7-4729-a09a-dc6d0ded15de"), new Guid("f2b39118-e101-4525-bfad-0191703b893f") });

            migrationBuilder.DeleteData(
                table: "RoomServices",
                keyColumns: new[] { "RoomId", "ServiceId" },
                keyValues: new object[] { new Guid("819515e4-aae1-42d5-b99d-e52dae949c5b"), new Guid("201ec157-075f-4f54-9303-ce07cbaf97cb") });

            migrationBuilder.DeleteData(
                table: "RoomServices",
                keyColumns: new[] { "RoomId", "ServiceId" },
                keyValues: new object[] { new Guid("819515e4-aae1-42d5-b99d-e52dae949c5b"), new Guid("43ad914e-33df-4222-9ef7-609a1978be69") });

            migrationBuilder.DeleteData(
                table: "RoomServices",
                keyColumns: new[] { "RoomId", "ServiceId" },
                keyValues: new object[] { new Guid("819515e4-aae1-42d5-b99d-e52dae949c5b"), new Guid("f2b39118-e101-4525-bfad-0191703b893f") });

            migrationBuilder.DeleteData(
                table: "RoomServices",
                keyColumns: new[] { "RoomId", "ServiceId" },
                keyValues: new object[] { new Guid("be95fc4b-2368-4d36-9852-bb15c0c0be77"), new Guid("201ec157-075f-4f54-9303-ce07cbaf97cb") });

            migrationBuilder.DeleteData(
                table: "RoomServices",
                keyColumns: new[] { "RoomId", "ServiceId" },
                keyValues: new object[] { new Guid("be95fc4b-2368-4d36-9852-bb15c0c0be77"), new Guid("43ad914e-33df-4222-9ef7-609a1978be69") });

            migrationBuilder.DeleteData(
                table: "RoomServices",
                keyColumns: new[] { "RoomId", "ServiceId" },
                keyValues: new object[] { new Guid("be95fc4b-2368-4d36-9852-bb15c0c0be77"), new Guid("f2b39118-e101-4525-bfad-0191703b893f") });

            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: new Guid("046b6271-5db7-4729-a09a-dc6d0ded15de"));

            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: new Guid("819515e4-aae1-42d5-b99d-e52dae949c5b"));

            migrationBuilder.DeleteData(
                table: "Rooms",
                keyColumn: "Id",
                keyValue: new Guid("be95fc4b-2368-4d36-9852-bb15c0c0be77"));

            migrationBuilder.DeleteData(
                table: "Services",
                keyColumn: "Id",
                keyValue: new Guid("201ec157-075f-4f54-9303-ce07cbaf97cb"));

            migrationBuilder.DeleteData(
                table: "Services",
                keyColumn: "Id",
                keyValue: new Guid("43ad914e-33df-4222-9ef7-609a1978be69"));

            migrationBuilder.DeleteData(
                table: "Services",
                keyColumn: "Id",
                keyValue: new Guid("f2b39118-e101-4525-bfad-0191703b893f"));
        }
    }
}
