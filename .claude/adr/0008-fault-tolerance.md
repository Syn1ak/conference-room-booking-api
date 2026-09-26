# 0008. Fault Tolerance

## Context

The task mentions fault tolerance once:

> The project will be extended in the future, so it must be scalable, secure, and fault-tolerant.

It names no mechanism, so this step picks a small set of standard ones that fit the API's size. The API has a single dependency, the database: SQL Server locally and Azure SQL Database in production. It makes no outgoing HTTP calls.

Some pieces are already in place:

- Errors are RFC 7807 ProblemDetails with a trace id. Unhandled exceptions return a generic 500 and are logged by the exception handler ([ADR 0001](0001-security-and-access-control.md)).
- Rate limiting protects the API from floods of requests.
- The per-room booking lock runs its transaction inside EF Core's execution strategy, so that database retries can be turned on ([ADR 0005](0005-persistence-for-rooms-and-bookings.md)).

Several questions are open:

| Open question | Why it matters |
|---|---|
| What happens when the database drops a connection? | Azure SQL drops connections now and then by design: failovers, maintenance, and waking a serverless database from auto-pause. Today each drop is a 500. |
| How does anyone know the API is up and can reach its database? | There's no health endpoint. App Service's Health check and the deployment in step 10 need one. |
| What is recorded about what happened? | Only the identity seeder logs anything. Bookings, cancellations, and lockouts leave no trace. |

## Decision

### 1. EF Core retries temporary database failures

- `UseSqlServer` turns on `EnableRetryOnFailure` with its defaults: up to 6 retries with exponential backoff, at most 30 seconds between attempts. The SQL Server provider already knows which errors are temporary, including the Azure SQL ones.
- Queries and `SaveChanges` are retried automatically. That covers startup seeding too, so a database that is still waking up doesn't crash the app.
- **Every transaction we open ourselves runs inside the execution strategy**, so a retry repeats the whole unit. The booking lock already does this. Registration, which creates the user and assigns the role in one transaction, moves inside the strategy as well. Otherwise the retrying strategy refuses to start the transaction.
- **Each retried unit starts with an empty change tracker.** Entities added by a failed attempt are still tracked, and without this they would be saved again on the next attempt. A retried booking would then insert two bookings.
- **A lock timeout isn't retried.** A room lock held for more than 10 seconds means something is stuck. The retrying strategy would treat a `TimeoutException` as temporary and keep the request waiting for minutes, so the lock reports the timeout as a non-temporary error and the request fails at once with a 500.
- EF Core's own logs are lowered to `Warning` in configuration. Every SQL command stops being logged, but each retry is still logged as a warning.

### 2. One health endpoint

- `GET /health` runs a database check (`AddDbContextCheck<ApplicationDbContext>`). It returns 200 `Healthy` when the database answers, and 503 `Unhealthy` when it doesn't.
- The body is only the status word. It doesn't name the database or include error details.
- It's anonymous and exempt from rate limiting, so monitoring and the platform can call it as often as they need.
- The check is registered in Infrastructure, which owns the `DbContext`. Api only maps the endpoint.

### 3. Logging business and security events

- The built-in `ILogger` writes to the console. App Service collects console output, and step 10 decides where it goes from there.
- These events are logged with structured message templates:

| Event | Level | Logged by |
|---|---|---|
| Booking created: booking, room, client, and slot | Information | `BookingService` |
| Booking cancelled: booking and client | Information | `BookingService` |
| Client registered: user id | Information | `AuthService` |
| Account locked out after repeated failed logins: user id | Warning | `IdentityService` |

- Logs identify people by user id. They never contain passwords, tokens, or request bodies.
- Unhandled exceptions are already logged by the exception handler, and database retries by EF Core.

## Options Considered

### Database retries

| Option | Why not chosen |
|---|---|
| **No retries** | Every temporary Azure SQL failure becomes a 500. |
| **Polly or `Microsoft.Extensions.Resilience` around the repositories** | We would have to maintain the list of temporary SQL errors ourselves, and it would clash with EF Core's strategy. There are no outgoing calls that would need a circuit breaker. |
| **SqlClient's built-in retry logic** (`SqlRetryLogicOption`) | It doesn't know about transactions, and EF Core's documentation advises against combining it with EF Core's retries. |

### Health checks

| Option | Why not chosen |
|---|---|
| **Separate liveness and readiness endpoints** | The usual pattern for orchestrators like Kubernetes. With one dependency and a single App Service, one endpoint is enough. Which endpoint App Service's Health check watches is decided in step 10. |
| **Xabaril `AspNetCore.HealthChecks.*` packages and the HealthChecks UI** | Third-party packages and a dashboard. The first-party EF Core check covers the only dependency. |
| **A detailed JSON response** with each check's result | Reveals internals to anonymous callers. The status word is enough. |

### Logging

| Option | Why not chosen |
|---|---|
| **Serilog** | Extra packages and configuration for sinks and enrichers we don't need yet. Call sites use `ILogger` either way, so switching later changes no code. |
| **OpenTelemetry or Application Insights now** | They pay off once the API is deployed and there's somewhere to send the data. That's step 10. |
| **Logging every HTTP request** (`AddHttpLogging`) | App Service already records each request in its own logs. Doing it in the app would be noise for this API. |

### Error responses

| Option | Why not chosen |
|---|---|
| **503 with `Retry-After` for temporary failures** once the retries run out | Clients could tell "try again later" from a bug, but retries already absorb short failures, and a 500 with a trace id is acceptable at this size. |
| **Request timeouts** (`AddRequestTimeouts`) | EF Core's 30-second command timeout already limits database work, and there are no outgoing calls. |

## Consequences

- **Positive:**
  - Short database failures, such as a failover or a serverless database waking up, no longer fail requests or startup.
  - A retried booking can't insert itself twice. The per-room lock still prevents overlaps, because the whole unit is retried inside the lock's transaction.
  - Monitoring and step 10's deployment can check the API and its database with one anonymous endpoint.
  - Every booking, cancellation, registration, and lockout leaves a log line that can be traced by user id.
- **Negative:**
  - A request can wait up to about a minute while retries run before it fails.
  - A database that is down or still starting, where the connection is refused or reset, isn't a transient error to SQL Server's strategy. Those requests fail at once with a 500, and `/health` reports it.
  - If a commit succeeds but its reply is lost, the retried booking finds its own booking and returns 409 "slot taken" ([ADR 0006](0006-api-endpoints-for-rooms-and-bookings.md) already accepts this).
  - Once retries run out, the client gets a 500, not a 503, so it can't tell a temporary failure from a bug.
  - Every transaction added in the future must run inside the execution strategy and clear the change tracker.
- **Follow-ups:**
  - Step 10: point App Service's Health check at `/health` and send logs to Application Insights or OpenTelemetry.
  - Idempotency keys on `POST /api/bookings`, so a retried request returns the original booking instead of 409.
  - A 503 with `Retry-After` for temporary failures, if clients need to tell them apart.
