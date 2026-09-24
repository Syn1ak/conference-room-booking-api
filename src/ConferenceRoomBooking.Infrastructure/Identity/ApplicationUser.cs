using Microsoft.AspNetCore.Identity;

namespace ConferenceRoomBooking.Infrastructure.Identity;

/// <summary>
/// A user account stored by ASP.NET Core Identity. Other layers refer to users by their <see cref="Guid"/> id only.
/// </summary>
public class ApplicationUser : IdentityUser<Guid>
{
}
