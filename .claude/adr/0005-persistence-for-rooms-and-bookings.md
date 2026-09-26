# 0005. Persistence for Rooms and Bookings

## Context

[ADR 0003](0003-domain-model-and-business-rules.md) and [ADR 0004](0004-pricing-engine.md) define rooms, services, and bookings as rich entities in Domain. The database so far holds only the ASP.NET Core Identity tables. This step has to store the new entities, and it inherits several open questions:

| Open question | Where it comes from |
|---|---|
| How does Application read and write data without depending on EF Core? | [ADR 0002](0002-architecture-and-project-structure.md): Domain and Application never see EF Core types. |
| How do private setters, backing fields, and value objects map to tables? | ADR 0003 consequences. |
| How are overlapping bookings prevented when two requests arrive at the same time? | [ADR 0001](0001-security-and-access-control.md) requires it. ADR 0003 promises a database-level guard. |
| How do the initial rooms and services from the task get into the database? | The task's "Initial Data". |
| What stops a price from having more decimals than the database stores? | Left open in step 4. |
| How are unique names and "can't delete while referenced" enforced? | ADR 0003, sections 2 and 8. |

The database is SQL Server locally and Azure SQL Database in production. It's accessed through EF Core, and migrations run as a separate deployment step.

## Decision

### 1. Repositories per aggregate

- Application defines one repository per aggregate: `IRoomRepository`, `IServiceRepository`, and `IBookingRepository`. Each has only the methods the use cases need, named for what they do, for example `FindAvailableAsync(slot, capacity)`.
- `IUnitOfWork.SaveChangesAsync` commits the changes of one use case.
- Infrastructure implements them with EF Core. There's no generic repository and no `IQueryable` outside Infrastructure.
- If the reports need projections, query interfaces for reading can be added when the reports are built.

### 2. EF Core maps the domain entities directly

- Mapping uses Fluent API `IEntityTypeConfiguration` classes in Infrastructure. Domain gets no attributes and no EF Core reference.
- Entities get private parameterless constructors that only EF uses. Collections map through their backing fields.

| Table | Maps | Keys and notes |
|---|---|---|
| `Services` | `Service` | Unique `Name` |
| `Rooms` | `Room` | Unique `Name` |
| `RoomServices` | `ServiceOffering` | Key (RoomId, ServiceId), plus `Price` |
| `Bookings` | `Booking`, with `BookingSlot` as a complex property (`Start`, `End` columns) | Index on (RoomId, Start) including End and Status |
| `BookingServices` | `BookedService` | Key (BookingId, ServiceId), plus `Name` and `Price`. A table rather than JSON, so reports can group by service. |

- Money columns are `decimal(18,2)`.
- Booking times are `datetimeoffset`, always in UTC.
- `Status` is stored as a string (`Confirmed`, `Cancelled`), so it's readable in queries and reports.

### 3. A per-room lock prevents double booking

Creating a booking runs in one database transaction:

1. Take an exclusive application lock for the room with `sp_getapplock` (resource `room-bookings:{roomId}`), owned by the transaction.
2. Check for confirmed bookings of that room that overlap the slot. If there are any, return a conflict.
3. Insert the booking and commit, which releases the lock.

A concurrent request for the same room waits at step 1. It then sees the first booking at step 2 and gets a clear conflict. Requests for other rooms never wait. The lock is held by the database, so it also works across several App Service instances.

Application reaches the lock through an interface. Infrastructure implements it so that the transaction runs inside EF Core's execution strategy, which keeps it compatible with the database retries planned for fault tolerance.

### 4. Initial data is seeded in a migration

- The initial services (Projector 500, Wi-Fi 300, Sound 700 UAH) and rooms (A, B, and C with the task's capacities and prices) are added with EF Core `HasData`, using fixed ids.
- Every seeded room offers all three services at their standard price, so booking with services works right away.
- The seed runs exactly once, as part of the schema version. It's included in migration bundles and SQL scripts, and a room an admin deletes doesn't come back.
- Once released, the seed data isn't edited. Changes go through the API, because a migration that changes `HasData` would overwrite admins' edits.

### 5. Prices have at most 2 decimal places

- Domain rejects a room's hourly price, a service's standard price, or an offering's price with more than 2 decimal places, and returns a validation error.
- Together with the `decimal(18,2)` columns, this means the model never holds a price the database would silently round.

### 6. Integrity rules have a database guard behind them

Application checks each rule first, so the client gets a clear message. The database enforces the same rule when two requests race.

| Rule (ADR 0003) | Application check | Database guard |
|---|---|---|
| Room and service names are unique | Look up the name | Unique index. SQL Server's default collation ignores case, so "room a" clashes with "Room A". |
| A room with bookings can't be deleted | Look for any booking | `Restrict` foreign key Booking → Room |
| A service offered by a room or included in a booking can't be deleted | Look for offerings and booked services | `Restrict` foreign keys RoomService → Service and BookingService → Service |
| Deleting a room deletes its offerings | — | `Cascade` foreign key RoomService → Room |
| A booking belongs to an existing client | The client id comes from the token | `Restrict` foreign key Booking → `AspNetUsers`. Domain still sees only a `Guid`. |

A unique index violation (SQL Server errors 2601 and 2627) is returned as the same conflict as the Application check, not as a 500. `ErrorType` gets a `Conflict` category, mapped to 409, when the first conflict is added.

### Scope

This step covers the mapping, the migration with the seed, the repositories, the per-room lock, and the precision rule. The use cases and endpoints that use them belong to the next step. Persistence is tested in `IntegrationTests/Persistence/` against SQL Server in Testcontainers. One test fires parallel bookings for the same slot and expects exactly one to succeed.

## Options Considered

### Database access

| Option | Why not chosen |
|---|---|
| **`ApplicationDbContext` used directly in Application** | Application would reference EF Core, which breaks ADR 0002, and use cases could only be tested against a database. |
| **An `IApplicationDbContext` exposing `DbSet<T>`** | `DbSet`, `Include`, and `ToListAsync` are EF Core types, so Application would still need the EF Core package, and `IQueryable` would leak into use cases. |
| **Repositories for writes plus query services for reads** | Two styles before there's a need for the second. Kept as the path for reports. |

### Mapping

| Option | Why not chosen |
|---|---|
| **Separate persistence models plus mappers** | Twice the classes, and syncing collections such as offerings and booked services by hand is easy to get wrong. |

### Preventing double booking

SQL Server has no exclusion constraint for time ranges; PostgreSQL has `EXCLUDE USING gist`.

| Option | Why not chosen |
|---|---|
| **Check, then insert, with no protection** | Two concurrent requests both see a free slot and both insert. |
| **Serializable transaction** | Correct, but concurrent bookings typically deadlock and SQL Server kills one (error 1205). Deadlocks become the normal conflict path and need retries. Locking also depends on the right index and covers more than necessary. |
| **Optimistic concurrency** (each booking updates a version column on its room) | Works on any provider, but bookings for the same room at different times also conflict, so a retry loop is needed. A version on the whole row also makes admin edits clash with bookings. |
| **Slot-occupancy table** (one row per 15-minute step, unique on RoomId and SlotStart) | The strongest guarantee, since the database refuses overlaps even if application code has a bug. But it means up to 68 rows per booking, cancellation must delete them, and changing the time grid means migrating data. Kept as the upgrade path if bookings get a second write path. |
| **Trigger or CHECK constraint with a user-defined function** | Not safe under concurrency without locking hints. |

### Seeding

| Option | Why not chosen |
|---|---|
| **Startup seeder, like `IdentitySeeder`** | Hard to make idempotent. "Insert if missing by name" brings back rooms an admin deleted, and "only if the catalog is empty" re-seeds after an admin removes everything. |
| **EF Core `UseSeeding`** | Same idempotence problem, and generated SQL migration scripts don't include it. |

### Price precision

| Option | Why not chosen |
|---|---|
| **Only a `decimal(18,2)` column** | SQL Server rounds silently: 500.555 would be stored as 500.56, while the booking total was calculated with 500.555. |
| **Domain rounds prices to 2 decimals** | Silently changes what the admin entered. |

## Consequences

- **Positive:**
  - Application and Domain stay free of EF Core, and use cases can be unit-tested with fake repositories.
  - Double booking is prevented across concurrent requests and several app instances, without deadlocks or retry loops.
  - Every integrity rule has a database guard, so a race between two requests can't break it.
  - A fresh database, including a reviewer's, has the task's rooms and services straight after migration.
- **Negative:**
  - The per-room lock is SQL Server specific and only protects code paths that take it. Today only booking creation inserts bookings.
  - Each new query means a new repository method.
  - Domain entities gain private constructors that only EF uses.
  - Seeded rows must never be edited in code after release.
- **Follow-ups:**
  - The next step adds the use cases and endpoints that use the repositories and the lock, and maps `Conflict` to 409.
  - Fault tolerance turns on database retries. The lock already runs inside the execution strategy.
  - Reports may add query interfaces for reading.
