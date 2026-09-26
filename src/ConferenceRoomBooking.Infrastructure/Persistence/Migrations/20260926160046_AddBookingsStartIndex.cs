using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ConferenceRoomBooking.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingsStartIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Not part of the model: EF Core can't index the columns of the Slot complex property.
            // Reports read the bookings of a period across all rooms, which IX_Bookings_RoomId_Start can't serve.
            migrationBuilder.CreateIndex(
                name: "IX_Bookings_Start",
                table: "Bookings",
                column: "Start")
                .Annotation("SqlServer:Include", new[]
                {
                    "RoomId", "End", "Status", "AttendeeCount", "RentalPrice", "TotalPrice",
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bookings_Start",
                table: "Bookings");
        }
    }
}
