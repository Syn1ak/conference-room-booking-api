namespace ConferenceRoomBooking.IntegrationTests.Persistence;

/// <summary>
/// Helpers for test data that doesn't clash with other tests or the seeded catalog in the shared database.
/// </summary>
internal static class TestData
{
    public static string UniqueName(string prefix) => $"{prefix} {Guid.NewGuid():N}";
}
