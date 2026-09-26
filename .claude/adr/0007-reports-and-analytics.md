# 0007. Reports and Analytics

## Context

The task asks to:

> Design and add reports to the solution that would be useful for the business.

It names no reports, so choosing them is part of the task. [ADR 0001](0001-security-and-access-control.md) already makes reports admin-only. The earlier decisions left data that reports can rely on:

- Each booking saves its room's hourly price, its services with their prices, the rental subtotal, and the total ([ADR 0003](0003-domain-model-and-business-rules.md), [ADR 0004](0004-pricing-engine.md)). Price changes don't alter past revenue.
- Bookings are never deleted. A cancelled one keeps its status and `CancelledAt`.
- Each booking records its `AttendeeCount`.
- Booked services are stored in their own table so they can be grouped ([ADR 0005](0005-persistence-for-rooms-and-bookings.md)).
- The time bands are data in `PricingSchedule`, and wall-clock rules are evaluated in the venue time zone.

Several questions are open:

| Open question | Where it comes from |
|---|---|
| Which reports does the business need? | The task names none. |
| When does a booking count as revenue, and in which period? | Bookings are paid for a future slot and can be cancelled until it starts. |
| Where is the aggregation done: in SQL or in C#? | ADR 0005 plans query interfaces for reading. The time bands and the venue time zone exist only in C#. |
| How is a report's period given? | ADR 0006 uses timestamps with an offset everywhere, but reports are about calendar days. |
| What stops a report from loading every booking ever made? | ADR 0006 pages the only list that grows with usage. |

## Decision

### 1. Four reports, each answering one business question

| Report | Question | Contents |
|---|---|---|
| **Revenue** | How much do we earn, and where from? | Rental, services, and total, for the whole period, per room, and per day or month. The total is split into earned and upcoming. Cancellations with their lost revenue. |
| **Occupancy** | Which rooms sit empty, and are they the right size? | Per room and overall: booked hours against open hours, bookings, average attendees and how full the room is, and cancellations. |
| **Demand** | Do the pricing bands work? | Booked hours against available hours for each time band (Morning, Standard, Peak, Evening), over the whole period and on each weekday. |
| **Service uptake** | Which extras sell? | Per catalog service: bookings that include it, the share of all bookings, and its revenue. |

Together they cover money, capacity, and pricing. Demand builds on the pricing engine: it shows whether the evening discount fills rooms and whether peak hours are really in demand. Cancellations aren't a report of their own. They're fields in revenue and occupancy, next to the numbers they reduce.

### 2. Shared definitions

- **Period.** `from` and `to` are venue-local dates, both included (`from=2024-09-01&to=2024-09-30`). The period may lie in the past, the future, or both. It lasts at most **366 days**, and `to` must not be before `from`. Otherwise the report returns 400.
- **Which bookings count.** A booking belongs to the day its slot starts on, in venue time. Bookings never cross midnight (ADR 0003), so each falls in exactly one day.
- **Confirmed bookings** make up revenue, booked hours, attendees, and service uptake. **Cancelled bookings** only appear in the cancellation fields.
- **Earned and upcoming.** A confirmed booking has earned its revenue once its slot has ended. Otherwise its revenue is upcoming: confirmed but not yet held. "Now" comes from `TimeProvider`.
- **Services revenue** is the total minus the rental subtotal, which is the sum of the saved service prices.
- **Lost revenue** is the total of the cancelled bookings.
- **Cancellation rate** is cancelled ÷ (confirmed + cancelled).
- **Open hours** are 17 per room per day (06:00–23:00, from `BookingSlot`). In the demand report, each band's available hours are its length times the number of rooms times the number of those weekdays in the period. The two Standard spans count as one band of 7 hours.
- **Fill rate** is attendees ÷ the room's capacity, averaged over confirmed bookings. Capacity isn't saved with the booking, so the room's current capacity is used.
- **Rooms and services with no bookings are listed with zeros**, as are days and months with none. An empty room is itself a finding.
- **Numbers.** Money in UAH with 2 decimal places. Sums of saved prices are exact, so nothing is rounded. Hours are decimals: quarter-hours are exact. Rates are fractions from 0 to 1, rounded to 4 decimal places.

### 3. The aggregation runs in C#, over the bookings of one period

- Application gets a read-only query interface in `Reports/`, as ADR 0005 foresaw. It returns the bookings that start within the period as small read-only rows: room, slot, status, attendees, rental, total, and the ids and prices of the booked services. Infrastructure implements it with EF Core, with no tracking.
- Application totals the rows into each report. The totalling is pure code without a database, and it's unit-tested.
- The demand report splits each slot across the bands with the same Domain code that `PriceCalculator` uses. That code moves out of the calculator into `PricingSchedule`, so the band boundaries and the time-zone conversion stay in one place.
- The 366-day limit keeps the load bounded: at most 34 bookings per room per day (30-minute minimum over 17 open hours), so about 37,000 rows for the three seeded rooms over a full year. Realistically it's a few thousand.
- A new index on `Start`, including the columns the reports read, serves the query. The existing index starts with `RoomId`, so it can't serve a range across all rooms.

### 4. Endpoints

All reports are `AdminOnly` and under the global rate limit.

| Method | Route | Success | Failures |
|---|---|---|---|
| GET | `/api/reports/revenue?from&to&groupBy` | 200, revenue for the period, per room, and per day or month (`groupBy=day` or `month`, default `month`) | 400 invalid period, 401, 403 |
| GET | `/api/reports/occupancy?from&to` | 200, occupancy per room and overall | 400, 401, 403 |
| GET | `/api/reports/demand?from&to` | 200, each time band over the whole period, and each weekday (Monday first) with its bands | 400, 401, 403 |
| GET | `/api/reports/services?from&to` | 200, uptake per catalog service | 400, 401, 403 |

Rooms and services are named with their current names. Neither can be deleted while a booking refers to it (ADR 0005), so every booking's room and services still exist. A month bucket that the period only partly covers counts only the days inside the period.

Every endpoint has XML doc summaries and response types for Swagger, and each Swagger description spells out the definitions from section 2.

## Options Considered

### Which reports

| Option | Why not chosen |
|---|---|
| **Top clients** by revenue | Needs client emails from Identity, which means a join across the Infrastructure boundary and personal data in a report. |
| **Daily agenda** (tomorrow's bookings and the services to prepare) | Useful for staff, but it's a filter on the bookings list rather than analytics. |
| **Booking lead time** (how far ahead clients book) | Needs a `CreatedAt` on bookings, which doesn't exist. Adding one is a small change if the report is wanted later. |
| **Cancellations as a report of their own** | The numbers mean more next to the revenue and occupancy they reduce. |
| **One dashboard endpoint** with every report | One large response that grows with every new report, and callers can't ask for just one. |

### Where the aggregation runs

| Option | Why not chosen |
|---|---|
| **In SQL**, with `GroupBy` and `EF.Functions.AtTimeZone` | Scales best, but splitting by band and bucketing by local day would copy the bands and the venue time zone into SQL. SQL Server needs Windows time-zone names, so `Europe/Kyiv` would have to be mapped. Kept as the scaling path for the simple sums, such as revenue per room. |
| **Pre-computed totals** in a statistics table, updated on booking and cancellation or by a background job | Fastest to read, but the totals have to be kept in step with every booking and cancellation. Speculative at this volume. |
| **An external BI tool** (Power BI or Metabase on Azure SQL) | Business users could build any report, but the task asks for reports in the solution, and reviewers couldn't try them. Worth a mention in the README. |

### Period

| Option | Why not chosen |
|---|---|
| **Timestamps with an offset**, as in the rest of the API | A report on "September" would need the time of day and the right offset for the first and last day. Calendar dates say it directly. |
| **`to` excluded**, like slot ends | Right for instants, but `to=2024-10-01` reads as if it included 1 October. |
| **Fixed periods** (`month=2024-09`) | Simpler to call, but rules out a quarter, a week, or "the next 30 days". |
| **No limit on the period** | The C# aggregation would load every booking ever made. |

### Details

| Option | Why not chosen |
|---|---|
| **Revenue per band** in the demand report | The price lines aren't saved (ADR 0004). After a schedule change, revenue per band could only be estimated from today's multipliers. Booked hours per band are exact. |
| **Save capacity on each booking** | Makes the fill rate exact after capacity edits, but needs a migration and a backfill for one ratio. |
| **Rates as percentages** | Fractions are the usual API convention, and clients format them. |

## Consequences

- **Positive:**
  - Each report answers one business question with numbers that stay correct after price changes, because they're built from the saved prices.
  - The time bands, opening hours, and venue time zone have a single definition shared by pricing, search, and reports.
  - The report logic is unit-tested without a database. The daylight-saving and local-day edge cases are tested in C#, where `TimeZoneInfo` handles them.
  - Upcoming revenue and future occupancy show what's already on the books, not only what has been earned.
- **Negative:**
  - The load grows with the bookings in a period. Beyond a few hundred thousand rows per year, the sums have to move into SQL.
  - The fill rate uses a room's current capacity, and occupancy assumes each room existed for the whole period, because rooms have no creation date.
  - The report period is the one place where the API takes dates instead of timestamps with an offset.
  - Reports are JSON only.
- **Follow-ups:**
  - CSV export for Excel users, through content negotiation on the same endpoints.
  - `CreatedAt` on bookings and a lead-time report, if the business asks for it.
  - A daily agenda for staff, as a filter on the bookings list.
