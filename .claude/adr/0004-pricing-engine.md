# 0004. Pricing Engine

## Context

The task defines the rental cost only through time bands:

> - **Standard hours (09:00–18:00):** base room price.
> - **Evening hours (18:00–23:00):** 20% discount on the room rental.
> - **Morning hours (06:00–09:00):** 10% discount.
> - **Peak hours (12:00–14:00):** 15% surcharge.

It leaves several questions open:

| Open question | What the task says |
|---|---|
| How do overlapping bands combine? | Peak (12:00–14:00) falls inside standard (09:00–18:00). |
| Is time charged per hour or per minute? | The room price is "per hour", while [ADR 0003](0003-domain-model-and-business-rules.md) allows bookings on a 15-minute grid. |
| How are services charged? | Services are listed with a price ("Projector: 500 UAH") but, unlike the room, not "per hour". Discounts are defined on "the room rental". |
| How are amounts rounded? | Nothing. An admin can set prices like 1999.99 UAH. |
| Where do the rules live? | Nothing, but "the project will be extended in the future". |

ADR 0003 already narrows the problem. Every booking lies within 06:00–23:00 on a single venue-local day, starts and ends on a 15-minute grid, and saves the room's hourly price and each service's price. So a slot never crosses midnight or a daylight-saving change, and every bookable minute falls inside a band.

## Decision

### 1. A data-driven schedule and one calculator

The bands are data: a list of time bands, each with a start, an end, and a multiplier on the room's hourly price. A single calculator intersects a booking's slot with each band. Adding or changing a band changes the data, not the algorithm.

### 2. Bands form a timeline without overlaps

The overlap is resolved once, where the schedule is defined: the peak surcharge applies to the base price and **replaces** the standard rate from 12:00 to 14:00. Each minute of the day has exactly one rate:

| Band | Venue local time | Multiplier |
|---|---|---|
| Morning | 06:00–09:00 | × 0.90 |
| Standard | 09:00–12:00 | × 1.00 |
| Peak | 12:00–14:00 | × 1.15 |
| Standard | 14:00–18:00 | × 1.00 |
| Evening | 18:00–23:00 | × 0.80 |

The bands are contiguous and cover exactly the opening hours from `BookingSlot`. A unit test enforces this, so changing the opening hours without the bands, or the reverse, fails the build.

### 3. Time is charged pro rata

Each band contributes `hours in the band × hourly price × multiplier`, where the hours can be fractional. Since slots lie on a 15-minute grid and band boundaries on full hours, every part is a whole number of quarter-hours. Clients pay for the time they book, and nothing is rounded up to a full hour.

### 4. Services are a flat fee per booking

Each chosen service adds its saved price once per booking, whatever the booking's length. Time-of-day multipliers apply only to the room rental, as the task says.

### 5. Rounding per line

Each line of the breakdown is rounded to 2 decimal places (kopiykas), with midpoints rounded away from zero. The total is the sum of the rounded lines, so the breakdown shown to the client always adds up to the total. With the task's prices, no rounding actually happens.

### 6. The rules live in Domain; the booking saves its price

- The schedule is defined in Domain code, next to the opening hours in `BookingSlot`, and is covered by unit tests. Changing a rate is a code change and a deployment.
- A pure `PriceCalculator` takes the slot, the room's hourly price, the chosen services, and the venue time zone. It returns a `PriceBreakdown`: one line per band the slot touches, one line per service, the rental subtotal, and the total.
- `Booking.Create` calculates the price and saves the **rental subtotal** and the **total** with the booking. Once saved, the price doesn't change, even if the schedule changes later.
- The booking confirmation returns the full breakdown.

### Example

Room A (2000 UAH/h), 11:00–15:00, with Projector (500 UAH) and Wi-Fi (300 UAH):

| Line | Calculation | Amount |
|---|---|---|
| Standard 11:00–12:00 | 1 h × 2000 × 1.00 | 2000.00 |
| Peak 12:00–14:00 | 2 h × 2000 × 1.15 | 4600.00 |
| Standard 14:00–15:00 | 1 h × 2000 × 1.00 | 2000.00 |
| **Rental** | | **8600.00** |
| Projector | flat | 500.00 |
| Wi-Fi | flat | 300.00 |
| **Total** | | **9400.00** |

## Options Considered

### Engine shape

| Option | Why not chosen |
|---|---|
| **Hard-coded branches** per band | Times and percentages get tangled with control flow. Every new band means editing the algorithm, and edge cases like 11:45–12:15 are easy to get wrong. |
| **A pipeline of pricing rules** (`IPricingRule` implementations applied in order) | Suits rules beyond time of day, like weekends or promo codes, but none exist yet. How overlaps combine depends on the order rules are registered. Speculative for four bands. |

### Overlapping bands

For the task's data, all the options give the same prices, because the standard band has a multiplier of 1.0. They differ only for bands added later.

| Option | Why not chosen |
|---|---|
| **Base bands plus override bands**, resolved by priority | Reads closer to the task, but it needs priority rules. The result is harder to follow than a plain timeline. |
| **Stacking** every band that applies | Ambiguous: peak inside evening could be 0.8 × 1.15 or 0.8 + 0.15, and either would surprise a client. |

### Granularity

| Option | Why not chosen |
|---|---|
| **Every started hour is billed in full** | 10:00–11:15 would cost 2 hours, which contradicts the 15-minute grid. An hour that crosses a band boundary needs its own rule. |
| **Hour by hour, priced by the band where the hour starts** | Wrong for slots that don't start on the hour: 11:45–12:15 would be billed entirely at the standard rate. |

### Services

| Option | Why not chosen |
|---|---|
| **Per hour, with time-of-day multipliers** | Nothing in the task suggests it, and the discounts are explicitly on the room rental. |
| **Per hour, without multipliers** | Also has no basis in the task. |

### Rounding

| Option | Why not chosen |
|---|---|
| **Round only the total** | Mathematically exact, but the lines shown to the client might not add up to the total. |

### Where the rules live

| Option | Why not chosen |
|---|---|
| **Configuration** (`appsettings` through Options) | Needs startup validation (contiguous, covering opening hours, positive multipliers), and the opening hours would have to move to configuration too. It's still a redeployment on App Service. |
| **Database, managed by admins** | Needs endpoints, validation, and versioning so reports know which rates applied when. Speculative for this task. |

## Consequences

- **Positive:**
  - Pricing is a pure function of the slot, the room's price, and the chosen services. It's unit-testable without a database, and room search can show the price of a slot without booking it.
  - Changing or adding a band means editing one table, and a test keeps it aligned with the opening hours.
  - Clients see a breakdown that adds up to the total, and confirmed bookings keep their price.
  - The saved rental subtotal lets reports separate rental revenue from service revenue.
- **Negative:**
  - Changing a rate requires a deployment.
  - Only the subtotal and total are saved, not the breakdown lines. After a schedule change, the lines for an old booking can't be reproduced exactly, although its total is still correct.
  - A service costs the same for a 30-minute and a 17-hour booking.
- **Follow-ups:**
  - Rules that don't depend on time of day (weekends, holidays, promo codes, per-hour services) can be added as later steps after the band calculation. This decision doesn't need to change.
  - The persistence step maps the rental subtotal and total on `Booking`.
