# 0002. Architecture and Project Structure

## Context

The task requires the solution to follow *Clean Code* practices and to be "scalable, secure, and fault-tolerant", because "the project will be extended in the future".

The core of the system is business logic, not data plumbing:

- rental pricing that depends on time bands (morning, standard, peak, evening),
- availability search and prevention of overlapping bookings,
- ownership rules from [ADR 0001](0001-security-and-access-control.md).

These rules must be easy to unit-test and must not depend on the database, the web framework, or the identity provider. The structure also has to accommodate things that are already planned: ASP.NET Core Identity with JWT, EF Core with SQL Server (Azure SQL Database in production), reports, and an Angular client served from the same origin.

## Decision

Use **Clean Architecture** for the project boundaries, and **group code by feature** (Rooms, Bookings, Auth, Reports) inside each layer.

### Projects and dependency rule

```
          ┌────────────────────┐
          │        Api         │  controllers, middleware, Swagger, composition root
          └─────────┬──────────┘
                    │ references
     ┌──────────────┼──────────────┐
     ▼                             ▼
┌───────────────┐        ┌───────────────────┐
│  Application  │◄───────│  Infrastructure   │  EF Core, SQL Server, Identity, JWT
└───────┬───────┘        └───────────────────┘
        │ references
        ▼
┌───────────────┐
│    Domain     │  entities, business rules
└───────────────┘
```

| Project | Responsibility | May reference |
|---|---|---|
| **Domain** | Entities, value objects, business rules | Nothing (pure C#) |
| **Application** | Use cases, grouped by feature; interfaces for what it needs from the outside (persistence, current user, tokens, time) | Domain |
| **Infrastructure** | Implementations of Application interfaces: EF Core, SQL Server, Identity, JWT | Application, Domain |
| **Api** | HTTP endpoints, request/response mapping, error handling, auth configuration, Swagger, dependency injection wiring | Application, Infrastructure |

Dependencies point inward only. The compiler enforces this through project references. Domain and Application never see EF Core, ASP.NET Core, or Identity types.

### Repository layout

```
conference-room-booking-api/
├── .claude/adr/                                 # architecture decision records
├── src/
│   ├── ConferenceRoomBooking.Domain/
│   ├── ConferenceRoomBooking.Application/
│   ├── ConferenceRoomBooking.Infrastructure/
│   └── ConferenceRoomBooking.Api/
├── tests/
│   ├── ConferenceRoomBooking.UnitTests/         # Domain and Application, no database
│   └── ConferenceRoomBooking.IntegrationTests/  # API end to end against a real database
├── client/                                      # Angular app, added later
├── docker-compose.yml                           # local SQL Server
├── Directory.Build.props                        # shared build settings
└── ConferenceRoomBooking.slnx
```

This ADR fixes only the projects, the dependency rules, and the top-level folders. Folders and files inside each project are decided together with the features that need them.

### Guardrails against over-engineering

- **Plain application services, no MediatR or full CQRS.** The use cases are few and simple. A mediator adds indirection without a clear benefit here. MediatR has also moved to a commercial license.
- **No generic repository per entity.** Application defines only the abstractions it actually needs.
- **Controllers, not minimal APIs.** Controllers give a familiar structure for grouping endpoints, filters, and Swagger metadata.
- **Shared build settings in `Directory.Build.props`**: target framework, nullable reference types, implicit usings, and warnings treated as errors.

### How ADR 0001 maps onto the layers

| Concern | Layer |
|---|---|
| Roles, ownership rules | Domain / Application |
| "Current user" and token-generation interfaces | Application |
| ASP.NET Core Identity, JWT generation, admin seeding | Infrastructure |
| Authentication middleware, authorization policies, rate limiting | Api |

## Options Considered

| Option | Why not chosen |
|---|---|
| **Single project with technical folders** (Controllers, Services, Data) | Layer boundaries aren't enforced, so business rules drift into controllers and data access. Doesn't meet the "scalable, Clean Code" requirement. |
| **Classic N-tier** (Api → Business Logic → Data Access) | Business logic depends on data access, which couples pricing and booking rules to EF Core and makes them harder to test and change. |
| **Pure vertical slices** | Keeps each feature together, but shared rules like pricing still need a deliberate home. It also gives no clear, enforced boundary around the domain. The feature-folder idea is adopted inside the layers instead. |
| **Modular monolith / microservices** | Operational and structural overhead far beyond the needs of a handful of entities and endpoints. |

## Consequences

- **Positive:**
  - Business rules are testable without a database or web server.
  - Infrastructure can be replaced in one project. For example, moving to an external identity provider or a different database leaves Domain and Application untouched.
  - The structure is widely recognized, which makes the codebase easy for reviewers and future contributors to navigate.
- **Negative:**
  - Four projects plus tests is more ceremony than the current feature set strictly needs.
  - Mapping between layers (entities ↔ DTOs) adds some code.
- **Follow-ups:** set up the solution skeleton according to this ADR, including removing the template's WeatherForecast sample. The persistence baseline and the domain model get their own steps and decisions.
