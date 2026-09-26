using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using ConferenceRoomBooking.Api.Auth;
using Microsoft.AspNetCore.Mvc;

namespace ConferenceRoomBooking.IntegrationTests.Auth;

[Collection(nameof(ApiCollection))]
public sealed class AuthEndpointsTests(ApiFactory factory)
{
    private const string ValidPassword = "Client123!";

    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task RegisterLoginAndMe_ReturnTheNewClientAccount()
    {
        var email = UniqueEmail();

        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, ValidPassword));
        Assert.Equal(HttpStatusCode.Created, registerResponse.StatusCode);
        var registered = await registerResponse.Content.ReadFromJsonAsync<RegisterResponse>();

        var me = await GetMeAsync(await LoginAsync(email, ValidPassword));

        Assert.Equal(registered!.UserId, me.UserId);
        Assert.Equal(email, me.Email);
        Assert.Equal(["Client"], me.Roles);
    }

    [Fact]
    public async Task Register_IgnoresRequestedRole_AndAlwaysCreatesAClient()
    {
        var email = UniqueEmail();

        var response = await _client.PostAsJsonAsync("/api/auth/register", new { email, password = ValidPassword, role = "Admin", roles = new[] { "Admin" } });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var me = await GetMeAsync(await LoginAsync(email, ValidPassword));
        Assert.Equal(["Client"], me.Roles);
    }

    [Fact]
    public async Task Register_WithAlreadyRegisteredEmail_ReturnsValidationError()
    {
        var email = UniqueEmail();
        await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, ValidPassword));

        var response = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email.ToUpperInvariant(), ValidPassword));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Contains("Email", problem!.Errors.Keys);
    }

    [Fact]
    public async Task Register_WithWeakPassword_ReturnsPasswordErrors()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(UniqueEmail(), "weak"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.NotEmpty(problem!.Errors["Password"]);
    }

    [Fact]
    public async Task Login_WithWrongPasswordOrUnknownEmail_ReturnsTheSameGeneric401()
    {
        var email = UniqueEmail();
        await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, ValidPassword));

        var wrongPassword = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, "Wrong123!"));
        var unknownEmail = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(UniqueEmail(), ValidPassword));

        Assert.Equal(HttpStatusCode.Unauthorized, wrongPassword.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, unknownEmail.StatusCode);

        var wrongPasswordProblem = await wrongPassword.Content.ReadFromJsonAsync<ProblemDetails>();
        var unknownEmailProblem = await unknownEmail.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal("Invalid email or password.", wrongPasswordProblem!.Title);
        Assert.Equal(wrongPasswordProblem.Title, unknownEmailProblem!.Title);
    }

    [Fact]
    public async Task Me_WithoutToken_IsRejectedByDefault()
    {
        var response = await _client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_WithTamperedToken_IsRejected()
    {
        var email = UniqueEmail();
        await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, ValidPassword));
        var token = await LoginAsync(email, ValidPassword);

        var tamperedToken = token[..^4] + (token.EndsWith("AAAA", StringComparison.Ordinal) ? "BBBB" : "AAAA");
        var response = await SendMeRequestAsync(tamperedToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SeededAdmin_CanLogInWithTheAdminRole()
    {
        var me = await GetMeAsync(await LoginAsync(ApiFactory.AdminEmail, ApiFactory.AdminPassword));

        Assert.Equal(ApiFactory.AdminEmail, me.Email);
        Assert.Equal(["Admin"], me.Roles);
    }

    private static string UniqueEmail() => $"client-{Guid.NewGuid():N}@integration.test";

    private async Task<string> LoginAsync(string email, string password)
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var login = await response.Content.ReadFromJsonAsync<LoginResponse>();
        return login!.AccessToken;
    }

    private async Task<CurrentUserResponse> GetMeAsync(string accessToken)
    {
        var response = await SendMeRequestAsync(accessToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        return (await response.Content.ReadFromJsonAsync<CurrentUserResponse>())!;
    }

    private Task<HttpResponseMessage> SendMeRequestAsync(string accessToken)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return _client.SendAsync(request);
    }
}
