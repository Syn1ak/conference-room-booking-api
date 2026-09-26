# 0006. API Endpoints for Rooms and Bookings

## Context

[ADR 0003](0003-domain-model-and-business-rules.md), [ADR 0004](0004-pricing-engine.md), and [ADR 0005](0005-persistence-for-rooms-and-bookings.md) give rooms, services, and bookings their rules, their prices, and their storage. Nothing reaches them over HTTP yet. The task lists five API methods: add, edit, and delete a room, search for available rooms, and book a room. [ADR 0001](0001-security-and-access-control.md) adds cancelling and viewing bookings, catalog management by admins, and who may call what.

Several questions are left open:

| Open question | Where it comes from |
|---|---|
| How is a room's list of services edited? | The task's edit example changes the price *or* adds a service ("adding a 'Sound' service for 700 UAH"), and `Room` has a separate method for each change. |
| How are use cases organised in Application? | ADR 0002 asks for plain application services, and `AuthService` is the only example so far. |
| How are times passed in? | The task's search input is "date 01.09.2024, time from 10:00 to 14:00", and its booking input has a "duration". ADR 0003 requires times with an explicit UTC offset. |
| How are bookings listed and cancelled? | ADR 0001: clients see and cancel their own bookings, admins see all. ADR 0003: bookings are never deleted. |
| Who may read rooms and services? | ADR 0001's access matrix only makes the search anonymous. It doesn't mention viewing rooms or the service catalog. |
| Which HTTP status does each failure get? | `ErrorType` has only `Validation`, `Unauthorized`, and `Conflict`. Nothing represents "not found" yet. |

## Decision

### 1. Editing a room replaces it whole

- `PUT /api/rooms/{id}` takes the same body as `POST /api/rooms`: name, capacity, hourly price, and the full list of services the room offers, each as `{ serviceId, price? }`.
- Services in the list that the room doesn't offer yet are added, services it offers get the new price, and services missing from the list are removed. It all happens in one request and one transaction.
- A missing `price` means the service's standard price, on create and on edit alike.
- An unknown `serviceId` is invalid input (400), not a missing resource.

### 2. One application service per feature

- `RoomService`, `BookingService`, and `ServiceCatalogService` sit next to `AuthService` in their feature folders in Application. There's no mediator and no class per use case.
- Controllers stay thin. They map request DTOs to calls, and results to responses or ProblemDetails.
- The catalog service is called `ServiceCatalogService` to avoid `ServiceService`.

### 3. Times are ISO 8601 with an offset, and slots are given as start and end

- Search takes `start` and `end` query parameters, and a booking takes `start` and `end` in its body, for example `2024-09-01T10:00:00+03:00`. The whole API uses one time format.
- In a query string, `+` has to be sent as `%2B`, or the time given in UTC with `Z`. Swagger UI encodes it correctly.
- The booking response includes the duration, which covers the "duration" in the task's output.
- The venue time zone comes from configuration (`Venue:TimeZone`, `Europe/Kyiv`) and is checked at startup.

### 4. Bookings are listed by role and cancelled with an action

- `GET /api/bookings` returns the bookings the caller may see: a client gets their own, an admin gets all. This is the same rule as `GET /api/bookings/{id}`. Ownership is checked in Application, as ADR 0001 requires.
- The list is paged with `page` and `pageSize`, with at most 100 per page. It's the only list that grows with usage. Rooms and services are small catalogs and aren't paged.
- `POST /api/bookings/{id}/cancel` cancels a booking and returns it. The booking isn't deleted: `GET` still returns it, with its status `Cancelled`.
- Only the client who made a booking can cancel it, as in ADR 0001's access matrix.

### 5. Rooms and services are public to read

- Listing and reading rooms and catalog services are anonymous, like the search. They expose the same data the search does, and a visitor needs a room's services and prices to decide on a booking.
- Changing rooms and services stays `AdminOnly`. All endpoints remain under the global rate limit.
- This extends ADR 0001's access matrix with the read endpoints it didn't mention.

### 6. Failures map to HTTP statuses by category

| Failure | Category | Status |
|---|---|---|
| Invalid input, including an unknown service id in a body | `Validation` | 400 |
| Unknown room, service, or booking, or another client's booking | `NotFound` (new) | 404 |
| Taken name, room with bookings, service in use, taken slot | `Conflict` | 409 |
| Cancelling a booking that's already cancelled or has started | `Conflict` (was `Validation`) | 409 |

Cancelling is refused because of the booking's current state, not because the request is malformed, so it's a conflict.

### Endpoints

| Method | Route | Access | Success | Notable failures |
|---|---|---|---|---|
| GET | `/api/services` | Anonymous | 200, the catalog | — |
| GET | `/api/services/{id}` | Anonymous | 200, the service | 404 |
| POST | `/api/services` | Admin | 201, the service | 409 name taken |
| PUT | `/api/services/{id}` | Admin | 200, the service | 404, 409 name taken |
| DELETE | `/api/services/{id}` | Admin | 204 | 404, 409 in use |
| GET | `/api/rooms` | Anonymous | 200, rooms with their services | — |
| GET | `/api/rooms/{id}` | Anonymous | 200, the room | 404 |
| POST | `/api/rooms` | Admin | 201, the room | 400 unknown service, 409 name taken |
| PUT | `/api/rooms/{id}` | Admin | 200, the room | 404, 400 unknown service, 409 name taken |
| DELETE | `/api/rooms/{id}` | Admin | 204 | 404, 409 has bookings |
| GET | `/api/rooms/available?start&end&capacity` | Anonymous | 200, free rooms with the rental price for the slot | 400 invalid slot |
| POST | `/api/bookings` | Client | 201, the booking with its full price breakdown | 400, 404 room, 409 slot taken |
| GET | `/api/bookings?page&pageSize` | Client (own) / Admin (all) | 200, a page of bookings | — |
| GET | `/api/bookings/{id}` | Owner / Admin | 200, the booking | 404 |
| POST | `/api/bookings/{id}/cancel` | Owner | 200, the cancelled booking | 404, 409 cancelled or started |

Every creating endpoint returns a `Location` header. Every endpoint has XML doc summaries and response types for Swagger.

The search returns each free room's rental price for the requested slot, without services. [ADR 0004](0004-pricing-engine.md) makes pricing a pure function, so this needs no booking. Only the booking confirmation has the breakdown lines: `GET` returns the saved rental price, services, and total, because ADR 0004 doesn't store the lines.

## Options Considered

### Editing a room's services

| Option | Why not chosen |
|---|---|
| **Sub-resources**: `PUT` for name, capacity and price, plus `PUT` and `DELETE` on `/api/rooms/{id}/services/{serviceId}` | Matches the `Room` methods one to one, but it's three endpoints instead of one. Changing the price and the services together takes several requests that don't succeed or fail together. Create and edit take different shapes. |
| **`PATCH`** with JSON Merge Patch or JSON Patch | DataAnnotations can't tell a missing field from a null one. Merge Patch replaces arrays whole anyway. JSON Patch needs Newtonsoft.Json, and both are awkward to document in Swagger. |

### Organising use cases

| Option | Why not chosen |
|---|---|
| **One class per use case** (`CreateBooking`, `CancelBooking`, …) | Smaller classes with fewer dependencies, but about 13 classes and registrations for simple use cases, and a second style next to `AuthService`. |

### Passing times

| Option | Why not chosen |
|---|---|
| **Search by `date`, `from`, and `to` in venue local time** | Reads closest to the task and avoids encoding `+`, but it puts two time formats in one API: local for search, with an offset for booking. |
| **Booking by `start` and a duration** | Matches the task's wording, but the search takes a range, and a duration needs its unit spelled out. |

### Listing and cancelling bookings

| Option | Why not chosen |
|---|---|
| **Separate `GET /api/bookings/mine` and `GET /api/bookings`** | One policy per endpoint, but two endpoints and two code paths for the same data. `GET /api/bookings/{id}` depends on the role anyway. |
| **`DELETE /api/bookings/{id}` to cancel** | Implies deletion, but the booking stays and `GET` still returns it. |
| **`PATCH` the booking's status** | Opens up generic status editing, and every other status change has to be rejected. |
| **No paging** | The admin list would grow without limit. |

### Reading the catalog

| Option | Why not chosen |
|---|---|
| **Authenticated reads only** | A visitor could find a free room but not see what it offers. The search already exposes the same data. |

## Consequences

- **Positive:**
  - Every method in the task is one request, and each endpoint maps directly onto ADR 0001's access matrix.
  - Create and edit share one body, so the Angular client needs one room form.
  - One time format everywhere, and the venue time zone is set once, in configuration.
  - Retrying a booking that already succeeded gets 409 "slot taken" instead of a duplicate booking.
  - A visitor sees the price of a slot before booking it.
- **Negative:**
  - To change one service, an admin sends the whole room. If two admins edit a room at once, the last save wins. `ETag` and `If-Match` would fix this and are left out for now.
  - Callers outside Swagger have to URL-encode the `+` in offsets.
  - The same booking list URL returns different bookings per role, so its Swagger description has to say so.
  - The booking confirmation and `GET` return different shapes: only the confirmation has the breakdown lines.
- **Follow-ups:**
  - Reports (step 7) can add filtered or aggregated booking queries next to the paged list.
  - Optimistic concurrency for room edits, if concurrent admin edits become a problem.
