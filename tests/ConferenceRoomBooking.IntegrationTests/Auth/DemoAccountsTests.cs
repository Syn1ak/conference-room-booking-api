using System.Net;
using System.Net.Http.Json;
using ConferenceRoomBooking.Api.Auth;

namespace ConferenceRoomBooking.IntegrationTests.Auth;

[Collection(nameof(ApiCollection))]
public sealed class DemoAccountsTests(ApiFactory factory)
{
    [Fact]
    public async Task List_IsAnonymous_AndGivesTheConfiguredAccounts()
    {
        using var client = factory.CreateClient();

        var accounts = await client.GetFromJsonAsync<List<DemoAccountResponse>>("/api/auth/demo-accounts");

        Assert.Equal(
            [
                new DemoAccountResponse("Client", ApiFactory.DemoClientEmail, ApiFactory.DemoPassword, "Client"),
                new DemoAccountResponse("Staff", ApiFactory.DemoStaffEmail, ApiFactory.DemoPassword, "Admin"),
            ],
            accounts);
    }

    [Theory]
    [InlineData(ApiFactory.DemoClientEmail, "Client")]
    [InlineData(ApiFactory.DemoStaffEmail, "Admin")]
    public async Task DemoAccount_CanSignIn_WithItsRole(string email, string role)
    {
        using var client = factory.CreateClient();

        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, ApiFactory.DemoPassword));
        var token = (await login.Content.ReadFromJsonAsync<LoginResponse>())!.AccessToken;
        client.DefaultRequestHeaders.Authorization = new("Bearer", token);
        var me = await client.GetFromJsonAsync<CurrentUserResponse>("/api/auth/me");

        Assert.Equal([role], me!.Roles);
    }

    [Fact]
    public async Task DemoAccount_CannotBeLockedOutByWrongPasswords()
    {
        using var client = factory.CreateClient();

        for (var attempt = 0; attempt < 6; attempt++)
        {
            await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(ApiFactory.DemoClientEmail, "Wrong123!"));
        }

        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(ApiFactory.DemoClientEmail, ApiFactory.DemoPassword));

        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }
}
