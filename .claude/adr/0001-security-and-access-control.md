# 0001. Security and Access Control

## Context

The task never mentions authentication, authorization, or roles. It only asks to:

> Provide an adequate level of security to avoid problems for the clients who will use the API.

Read against the API methods, that sentence points to concrete risks:

| Risk | Example |
|---|---|
| Anyone can change the catalog | An anonymous caller deletes "Room A" or sets its price to 0 UAH. |
| Clients see or touch each other's data | Client X lists or cancels Client Y's booking by guessing its ID. |
| Clients are charged incorrectly | The request body carries a `totalPrice` and the server trusts it. |
| Double booking | Two clients book Room B for 10:00–12:00 at the same moment and both succeed. |
| Invalid input corrupts data | Negative capacity, end time before start time, booking in the past. |
| Abuse and data leaks | Flooding the booking endpoint; stack traces or connection strings in error responses. |

So "security" here means several things: controlling who may do what, isolating each client's data, keeping data integrity and prices correct, and hardening the API.

## Decision

### 1. Actors and roles

There are two roles:

- **Admin** — company staff. Manages rooms and services and views reports.
- **Client** — a business customer. Searches rooms and manages *their own* bookings.

Anonymous callers may only register, log in, and search for available rooms.

### 2. Authentication: ASP.NET Core Identity + JWT bearer tokens

- **ASP.NET Core Identity** is the user store. It provides password hashing, lockout after failed attempts, and the password policy.
- `POST /api/auth/register` creates a **Client**. The API has no public way to create an Admin.
- `POST /api/auth/login` returns a short-lived signed **JWT** (60 min) that carries the user id and role.
- The first Admin is seeded at startup from configuration, never from source code.
- The JWT signing key comes from configuration and is never committed.
- Locally, these secrets live in .NET user-secrets. In Azure App Service, they live in the app's Application Settings.
- Swagger gets an "Authorize" button so reviewers can try protected endpoints.

**Out of scope for now:** refresh tokens, email confirmation, password reset, and external login.

### 3. Access matrix

| Endpoint group | Anonymous | Client | Admin |
|---|:-:|:-:|:-:|
| Register / login | ✅ | ✅ | ✅ |
| Search available rooms | ✅ | ✅ | ✅ |
| Create / edit / delete rooms and services | ❌ | ❌ | ✅ |
| Create booking | ❌ | ✅ | ❌ |
| View / cancel **own** bookings | ❌ | ✅ | — |
| View all bookings | ❌ | ❌ | ✅ |
| Reports and analytics | ❌ | ❌ | ✅ |

Authorization is enforced with policies (`AdminOnly`, `ClientOnly`). Ownership is checked in the application layer. A client who requests another client's booking gets **404**, not 403, so the API doesn't reveal that the booking exists.

### 4. Integrity and correctness (details in later decisions)

- The server always calculates the price. The API ignores any price a client sends.
- Overlapping bookings for the same room are rejected, and the check is safe under concurrent requests.
- Every request DTO is validated: capacity > 0, prices ≥ 0, start < end, no bookings in the past, only services the room offers.

### 5. API hardening

- HTTPS redirection and HSTS outside Development. Azure App Service terminates TLS, and the app additionally sets its "HTTPS Only" setting.
- Built-in ASP.NET Core **rate limiting**, stricter on `login` and `register`.
- Global exception handling that returns RFC 7807 **ProblemDetails**, with no stack traces outside Development.
- No secrets in `appsettings.json`.
- No CORS. The Angular client is served from the same origin as the API.

## Options Considered

| Option | Why not chosen |
|---|---|
| **No authentication** (take the task literally) | Anyone could delete rooms or cancel other clients' bookings. That fails the stated security requirement. |
| **API keys per client** | Easy for B2B integrations, but it models users and roles poorly, and key rotation adds work of its own. |
| **External identity provider** (Keycloak, Auth0, Entra ID) | Production-grade, but reviewers would need to set up extra infrastructure just to run the project. Kept as a future migration path: the API validates standard JWTs, so switching the token issuer later is mostly configuration. |
| **Identity's built-in `MapIdentityApi` tokens** | Less code, but the tokens are opaque and Identity-specific rather than standard JWTs, and customizing claims and endpoints is harder. |

## Consequences

- **Positive:** the catalog and reports are protected, clients are isolated from each other, the setup runs locally with nothing but the API and its database, and the auth is standard and familiar to reviewers.
- **Negative:** Identity adds its own tables to the database. Without refresh tokens, users log in again when the token expires. The admin must be seeded through configuration.
- **Follow-ups:** the booking-overlap concurrency strategy and the validation approach get their own decision records.
