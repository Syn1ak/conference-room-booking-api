# Conference Room Booking

An API and web app for renting out conference rooms: clients search for free rooms, book them with extra services,
and see exactly what they'll pay; staff manage rooms and services and follow the business in reports.

Built as a backend test task ([the brief](.claude/BackendTZ.md)) with ASP.NET Core 10, EF Core and SQL Server, and an
Angular 22 client served from the same origin.

**Live demo:** https://conference-rooms-71b9ce.azurewebsites.net · **API docs:** https://conference-rooms-71b9ce.azurewebsites.net/swagger

**Demo accounts:** the sign-in page offers a demo client and a demo staff member; one click signs in, no
registration needed. They're shared, so others may see your test bookings.

> **The demo runs on Azure's free tiers, so give it a moment.**
> - **The first visit after a quiet spell is slow.** The free App Service plan (F1) puts the app to sleep after about
>   20 idle minutes; waking it takes around 20–30 seconds.
> - **The database pauses too.** The free Azure SQL offer pauses when idle; the first request after a pause can take
>   up to a minute while it resumes. The app retries database calls, so the page loads once it's up rather than
>   failing. If a page shows an error, reload it after a few seconds.
> - **There's a daily CPU quota** of 60 minutes on F1. It's plenty for reviewing, but heavy load can stop the app until
>   the quota resets.
>
> None of this applies when running locally, and moving to a paid tier (B1 with Always On) removes all three.

## What it does

| For | Features |
|---|---|
| **Visitors** | Browse rooms with their services and prices; search for rooms free at a time that hold a group, priced for exactly that time; see the day's rates. |
| **Clients** | Register and sign in; book a room with services and get the full price breakdown; see, open, and cancel their bookings. |
| **Staff** | Manage rooms and the service catalog; see every booking; four reports: revenue, occupancy, demand by time band, and service uptake. |

### Pricing

The room's hourly rate changes through the day, charged pro rata to the minute of each band:

| Band | Venue time (Kyiv) | Rate |
|---|---|---|
| Morning | 06:00–09:00 | −10% |
| Standard | 09:00–12:00, 14:00–18:00 | base rate |
| Peak | 12:00–14:00 | +15% |
| Evening | 18:00–23:00 | −20% |

Services are a flat fee per booking. For example, Room A (2,000 UAH/h) from 11:00 to 15:00 with a projector and Wi-Fi:
2,000 + 4,600 (2 h at peak) + 2,000 rental, plus 500 + 300 services, is **9,400 UAH**. The server always calculates the
price; bookings keep the prices they were made at.

## Technical decisions

Each decision is recorded as an ADR with the options considered:

| # | Decision |
|---|---|
| [0001](.claude/adr/0001-security-and-access-control.md) | Security: Identity + JWT, Admin and Client roles, ownership checks, rate limiting, ProblemDetails |
| [0002](.claude/adr/0002-architecture-and-project-structure.md) | Clean Architecture (Domain, Application, Infrastructure, Api), grouped by feature |
| [0003](.claude/adr/0003-domain-model-and-business-rules.md) | Domain model: rooms, catalog services, bookings; opening hours, 15-minute grid, UTC storage in venue time |
| [0004](.claude/adr/0004-pricing-engine.md) | Pricing: a data-driven band timeline, pro rata, rounding per line |
| [0005](.claude/adr/0005-persistence-for-rooms-and-bookings.md) | Persistence: repositories, seeded catalog, a per-room lock that prevents double booking under concurrency |
| [0006](.claude/adr/0006-api-endpoints-for-rooms-and-bookings.md) | API endpoints and access per endpoint |
| [0007](.claude/adr/0007-reports-and-analytics.md) | Reports: revenue, occupancy, demand, service uptake |
| [0008](.claude/adr/0008-fault-tolerance.md) | Fault tolerance: database retries, health endpoint, logging |
| [0009](.claude/adr/0009-deployment-and-ci.md) | Deployment and CI: GitHub Actions, Azure App Service and Azure SQL, OIDC, migrations as a deploy step |

The client follows a domain-driven Angular structure (core, layout, domains with pages and features, shared UI):
standalone, zoneless, signals and Signal Forms, `httpResource` for reads, Tailwind CSS 4 with light and dark themes,
and accessible components built on the Angular CDK and Angular Aria.

## Running locally

Needs the .NET 10 SDK, Node 24, and Docker.

```bash
cp .env.example .env               # then set MSSQL_SA_PASSWORD
docker compose up -d               # SQL Server
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost,1433;Database=ConferenceRoomBooking;User Id=sa;Password=<your password>;TrustServerCertificate=True" --project src/ConferenceRoomBooking.Api
dotnet user-secrets set "Jwt:SigningKey" "$(openssl rand -base64 48)" --project src/ConferenceRoomBooking.Api
dotnet user-secrets set "AdminAccount:Email" "admin@example.test" --project src/ConferenceRoomBooking.Api
dotnet user-secrets set "AdminAccount:Password" "<a password with upper, lower, digit, symbol>" --project src/ConferenceRoomBooking.Api
dotnet run --project src/ConferenceRoomBooking.Api --launch-profile http
```

The API runs on http://localhost:5213 (Swagger UI at `/swagger`) and migrates the database on startup in Development.
For the client, in another terminal:

```bash
cd client && npm ci && npm start   # http://localhost:4200, proxying /api to the API
```

## Tests

| Suite | Command | What it covers |
|---|---|---|
| .NET unit and integration | `dotnet test` | Domain rules, pricing, reports; every endpoint against a real SQL Server in Testcontainers, including parallel bookings for one slot |
| Client unit | `cd client && npm test` | Components, forms, and services with Vitest |
| End to end | `cd client && npm run e2e` | Playwright against the published app on its own database: booking flows, admin flows, reports, concurrent bookings and other races, accessibility (axe) in both themes, and small screens |

## CI and deployment

[GitHub Actions](.github/workflows) run the three test suites on every push and pull request. When CI passes on
`master`, the deploy workflow signs in to Azure with OpenID Connect (no stored credentials), applies the EF Core
migrations as a bundle, publishes the API with the built client, and waits for `/health`.

The Azure resources (App Service on F1, in Poland Central; Azure SQL free offer, in Sweden Central) are created by
[`infra/provision.sh`](infra/provision.sh), which also connects GitHub to Azure. Secrets are generated there and live
only in App Service settings and GitHub secrets.
