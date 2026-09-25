# 0003. Domain Model and Business Rules

## Context

The task defines three concepts: conference **rooms**, the **services** they offer, and **bookings**. It leaves most of their rules open:

| Open question | What the task says |
|---|---|
| Is a service owned by a room or shared? | Creating a room takes services *with prices* ("projector, 500 UAH"), but the initial data lists services as a global catalog. |
| When can a room be booked? | Pricing bands cover 06:00–23:00. Nothing is said about other hours. |
| What does "10:00" mean? | Rules are wall-clock times ("18:00–23:00"), while the API is hosted on Azure App Service, which runs in UTC. |
| What happens to a booking when prices change? | Rooms can be edited ("changing the rental price to 2500 UAH"). |
| What happens to bookings when a room is deleted? | Deletion only returns "confirmation of deletion". |
| Does a booking know how many people attend? | Search filters by capacity, but the booking input has no headcount. |

[ADR 0002](0002-architecture-and-project-structure.md) places these rules in the Domain layer, where they can be unit-tested without a database or web server.

This ADR does **not** cover how the rental cost is calculated (how time bands combine, per hour or per minute, how services are charged). That's the pricing engine's decision. It also doesn't cover preventing double booking under concurrent requests, which is a persistence decision.

## Decision

### 1. A rich domain model, kept lean

- Entities guard their own rules. State changes only through factory and behaviour methods, and properties have private setters.
- Methods that can fail for an expected reason return a `Result`. `Result` and `Error` move from Application into Domain, so Domain can use them without depending on Application.
- Value objects are used only where they carry rules, such as a booking's time slot. There are no domain events and no specifications.
- Some rules span many entities, for example "bookings for one room must not overlap". They're checked in Application, and the persistence layer adds a database-level guard.

### 2. Model

```
Service (catalog)            Room                          Booking
─────────────────            ────                          ───────
Id                           Id                            Id
Name (unique)                Name (unique)                 RoomId
StandardPrice                Capacity                      ClientId
                             HourlyPrice                   Start, End (UTC)
                             Offerings: RoomService[]      AttendeeCount
                               ServiceId                   Status, CancelledAt
                               Price                       RoomHourlyPrice (snapshot)
                                                           BookedServices[] (snapshot)
                                                             ServiceId, Name, Price
                                                           TotalPrice
```

- **Service** is a catalog entry managed by admins. It has a unique name and a standard price, for example Projector at 500 UAH.
- **Room** has a unique name, a capacity greater than 0, an hourly price of at least 0, and the services it offers. Each offering (`RoomService`) has its own price for that room, which defaults to the service's standard price. A room offers each service at most once.
- **Booking** belongs to one client and one room. `ClientId` is the user's id. Domain knows nothing about ASP.NET Core Identity.
- Money is a plain `decimal` in UAH, the only currency.

### 3. Time is stored in UTC and evaluated in the venue's time zone

- Booking times are `DateTimeOffset` values, stored in UTC.
- Wall-clock rules (opening hours, the time grid, and later the pricing bands) are evaluated after converting to the **venue time zone**. The time zone comes from configuration (`Europe/Kyiv`), not from the server's clock or locale.
- "Now" comes from `TimeProvider`, so tests can control it.
- API requests must carry an explicit UTC offset, for example `2024-09-01T10:00:00+03:00`. A time without an offset would be interpreted in the server's own zone.

### 4. Opening hours and slot rules

A booking is valid only if, in venue local time:

- it starts and ends on the **same day**, between **06:00 and 23:00**, the span covered by the pricing bands;
- its start and end fall on a **15-minute grid**;
- it lasts at least **30 minutes**;
- it starts **in the future**, and **no more than 1 year** ahead.

A booking's time range includes its start and excludes its end. Back-to-back bookings (10:00–12:00 and 12:00–14:00) are allowed, and there's no buffer between them.

### 5. Booking lifecycle

- A booking is created as `Confirmed`. It can be cancelled, which sets `Cancelled` and `CancelledAt`. Bookings are never deleted.
- Only a booking that hasn't started yet can be cancelled.
- A cancelled booking frees its time slot. Only `Confirmed` bookings count toward overlap checks and availability.
- A room is **available** for a time slot when its capacity is at least the requested headcount and no confirmed booking for it overlaps the slot.

### 6. Attendee count

- A booking records a required `AttendeeCount`, between 1 and the room's capacity at booking time.
- Reducing a room's capacity later doesn't affect existing bookings. They were valid when they were made.

### 7. Prices are saved with the booking

When a booking is made, it saves the room's hourly price, the id, name, and price of each chosen service, and the total, all as they are at that moment.

- Editing a room's price or services affects only **new** bookings.
- Removing a service from a room doesn't change bookings that already include it.
- A booking may only include services the room currently offers.

### 8. Deleting rooms and services

- A room can be deleted only if it has **no bookings at all**, including past and cancelled ones. Otherwise the API returns **409 Conflict**. A room that has been booked can still be edited.
- Deleting a room deletes its offerings.
- A catalog service can be deleted only if no room offers it and no booking includes it.

## Options Considered

### Richness of the domain model

| Option | Why not chosen |
|---|---|
| **Anemic entities**, with rules in Application services | Nothing stops invalid state, and rules get spread across services. Weak on the task's Clean Code requirement. |
| **Full tactical DDD** (domain events, specifications, value objects everywhere) | Too much ceremony for three entities, and against the "no speculative abstractions" rule. |

### Services

| Option | Why not chosen |
|---|---|
| **Room owns its services** as name and price rows | Service names repeat per room and can be misspelled, so reports would group by string. The catalog management from ADR 0001 would have nothing to manage. |
| **Global catalog with one fixed price** | A service couldn't cost more in a bigger room, and the prices in the "add room" input would have nowhere to go. |

### Time representation

| Option | Why not chosen |
|---|---|
| **Local venue wall-clock time** (date, start time, end time) | Reads closest to the task, but it ties stored data to one time zone and differs from the common convention of storing instants in UTC. |
| **Time zone per room** | Speculative. Nothing in the task needs venues in several cities. |

### Opening hours

| Option | Why not chosen |
|---|---|
| **Open 24/7** | 23:00–06:00 has no pricing band, so a night rate would have to be invented. |
| **Opening hours per room** | Speculative, and it needs its own admin workflow and validation. |

### Booking lifecycle and prices

| Option | Why not chosen |
|---|---|
| **Delete the booking on cancellation** | Loses the history that reports and audits need. |
| **Recalculate prices from the room's current data** | A price change would silently alter bookings clients already confirmed, and revenue reports would drift. |
| **A `Money` value object** | There's only one currency, so it would be an abstraction without a second case to justify it. |

### Deleting rooms

| Option | Why not chosen |
|---|---|
| **Delete the room and its bookings** | Clients silently lose confirmed bookings, and revenue history disappears. |
| **Archive the room and auto-cancel its upcoming bookings** | Cancels clients' bookings as a side effect, and there's no way to notify them. |
| **Archive the room, refuse while it has upcoming bookings** | Keeps history for rooms that were booked, but adds an archived state and requires admins to be able to cancel any booking. More than this task needs. |

## Consequences

- **Positive:**
  - Business rules live in the entities and can be unit-tested without a database.
  - Bookings keep the prices the client agreed to, so price changes and reports stay consistent.
  - Every bookable minute falls inside a pricing band.
  - Service identity is stable, which makes reports by service reliable.
- **Negative:**
  - A room that has ever been booked can't be deleted, only edited. If that becomes a problem, archiving is the natural next step.
  - Every wall-clock rule converts from UTC to the venue time zone, so the conversion must be tested around daylight-saving changes. In Kyiv they happen at 03:00–04:00, outside opening hours.
  - `AttendeeCount` goes slightly beyond the task's booking input.
  - EF Core mapping needs private constructors and backing fields for the rich entities.
- **Follow-ups:**
  - Move `Result` and `Error` into a new Domain project.
  - The pricing engine decides how time bands combine, per hour or per minute, and how services are charged.
  - The persistence step decides the schema, seeding of the initial rooms and services, and the concurrency-safe overlap guard.
