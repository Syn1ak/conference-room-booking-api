# Backend Test Task: Conference Room Booking API

## Task Context

You work at a company that develops an application for managing the booking and rental of conference rooms. Your task is to build an API for managing rooms and bookings and for calculating rental costs.

## Problem Description

The company rents out conference rooms to businesses. You need to develop a simple API that lets clients search for available rooms, book them, and calculate the rental cost based on the time and the services they choose.

## Technical Requirements

### API Methods

1. **Add a conference room**
   - **Input:** Room name (e.g., "Room A"), capacity (e.g., 50 people), list of available services (e.g., projector, 500 UAH; Wi-Fi, 300 UAH), base rental price per hour (e.g., 2000 UAH).
   - **Output:** Confirmation that the room was created, with a unique ID.

2. **Edit room information**
   - **Input:** Room ID and updated data (e.g., changing the rental price to 2500 UAH, or adding a "Sound" service for 700 UAH).
   - **Output:** Confirmation that the update succeeded.

3. **Delete a conference room**
   - **Input:** Room ID.
   - **Output:** Confirmation of deletion.

4. **Search for available rooms**
   - **Input:** Date and time, capacity (e.g., date 01.09.2024, time from 10:00 to 14:00, capacity 50 people).
   - **Output:** List of available rooms.

5. **Book a room**
   - **Input:** Room ID, booking date and time, duration, selected services.
   - **Output:** Booking confirmation with the calculated total rental cost.

## Initial Data

- **Rooms:**
  - Room A: capacity 50 people, base price 2000 UAH per hour.
  - Room B: capacity 100 people, base price 3500 UAH per hour.
  - Room C: capacity 30 people, base price 1500 UAH per hour.

- **Services:**
  - Projector: 500 UAH.
  - Wi-Fi: 300 UAH.
  - Sound: 700 UAH.

## Rental Cost Calculation

The rental cost depends on the booking time:

- **Standard hours (09:00–18:00):** base room price.
- **Evening hours (18:00–23:00):** 20% discount on the room rental.
- **Morning hours (06:00–09:00):** 10% discount.
- **Peak hours (12:00–14:00):** 15% surcharge.

## Additional Requirements

1. **Clean code and scalability:** Apply the practices from Robert Cecil Martin's book *Clean Code* when writing the solution. The project will be extended in the future, so it must be scalable, secure, and fault-tolerant. Provide an adequate level of security to avoid problems for the clients who will use the API.
2. **Reports and analytics:** Design and add reports to the solution that would be useful for the business.

## Nice to Have

- A filled-in Git README
- Comments in the code
- API documentation using Swagger

## Submission Format

- A link to the code repository.
- Short project documentation describing the business tasks and the technical decisions.
