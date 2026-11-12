# Ship Ticketing API (Week 11)

Auth: send `Authorization: Bearer <token>` (token comes from a successful login). 🔓 = public, 👤 = logged in, 🛡️ = admin.

| Area | Endpoint | Access |
|---|---|---|
| Auth | `POST /api/auth/register` `POST /api/auth/login` (customers) | 🔓 |
| | `POST /api/auth/admin/login` (admins only) | 🔓 |
| | `GET/PUT /api/auth/me`, `PUT /api/auth/change-password` | 👤 |
| Users | `GET/POST /api/users`, `GET/PUT/DELETE /api/users/:id` | 🛡️ |
| Ports / Boats / Routes | `GET /api/{ports,boats,routes}` + `/:id` | 🔓 |
| | `POST`, `PUT /:id`, `DELETE /:id` | 🛡️ |
| Trips | `GET /api/trips?origin=&destination=&date=YYYY-MM-DD&upcoming=true`, `GET /:id`, `GET /:id/seats` | 🔓 |
| | `POST`, `PUT /:id`, `DELETE /:id`, **`PATCH /:id/cancel`** (body `{reason}`, e.g. bad weather) | 🛡️ |
| Bookings | `POST /api/bookings` (checkout), `GET /my`, `GET /:id`, `PATCH /:id/cancel`, **`GET /:id/reschedule-options`**, **`POST /:id/reschedule`** | 👤 |
| | `GET /api/bookings` (all, filter/search) | 🛡️ |
| Tickets | `GET /api/tickets/my?when=upcoming\|past`, `GET /:id` | 👤 |
| | `GET /verify/:ticketNumber`, `PATCH /:id/board` | 🛡️ |
| Payments | `GET /api/payments/my`, `GET /:id`, `POST /:id/pay-online` | 👤 |
| | `GET /api/payments`, `PATCH /:id/confirm` (cash received), `PATCH /:id/refund` | 🛡️ |
| Invoices | `GET /api/invoices/my`, `/booking/:bookingId`, `/:id` | 👤 |
| Notifications | `GET /api/notifications/my`, `PATCH /read-all`, `PATCH /:id/read`, `DELETE /:id` | 👤 |
| | `POST /api/notifications/broadcast` | 🛡️ |
| Dashboard | `GET /api/admin/stats` | 🛡️ |

## Sample bodies

Register: `{ "firstName":"Juan","lastName":"Dela Cruz","age":22,"gender":"male","contactNumber":"09171234567","email":"juan@email.com","password":"secret123" }`

Add boat (seats auto-generated): `{ "name":"MV Sample","registrationNumber":"REG-1","seatCounts":{"economy":50,"business":10},"cargoCapacityKg":2000 }`

Add trip: `{ "boat":"<id>","route":"<id>","departureAt":"2026-11-05T08:00:00+08:00","arrivalAt":"2026-11-05T10:30:00+08:00","fares":{"economy":350,"business":600},"cargoRatePerKg":15 }`

Save e-wallets on the signed-in profile with `PUT /api/auth/me`: `{ "preferences":{"wallets":[{"provider":"gcash","accountNumber":"09171234567"}]} }`. Supported providers are `gcash` and `maya`; do not send a wallet PIN or password. A saved wallet's ID can be passed as `payment.walletId` during booking, and only its last four digits are added to payment history.

Book passenger(s):
```json
{ "tripId":"<id>","bookingType":"passenger",
  "passengers":[
    {"useMyDetails":true,"seatNumber":"E1"},
    {"firstName":"Maria","lastName":"Dela Cruz","age":8,"seatNumber":"E2","fareCategory":"child"}],
  "payment":{"channel":"online","method":"gcash","walletId":"<savedWalletId>"} }
```
Book cargo: `{ "tripId":"<id>","bookingType":"cargo","cargo":{"description":"Rice sacks","weightKg":50,"recipientName":"Maria Dela Cruz","recipientContact":"09123456789","vipSeatNumber":"V1"},"payment":{"channel":"physical","method":"cash"} }` (`recipientName` and `recipientContact` are required; VIP seat is optional. A selected VIP seat is reserved and its fare is added to the cargo charge.)

## Cancellation rules
- User can cancel up to **4 hours before departure** (admin can cancel anytime). Paid bookings become `refund_pending`; admin then marks `refunded`.
- **Bad weather / operator cancel:** admin calls `PATCH /api/trips/:id/cancel` with `{ "reason": "Bad weather" }`. Every pending/confirmed booking on that trip becomes `reschedule_pending` and the user is notified. The 4-hour rule does not apply to these bookings.
- The user then either:
  - **Reschedules:** `GET /bookings/:id/reschedule-options` (same route, upcoming trips, shows if it fits), then `POST /bookings/:id/reschedule` with `{ "newTripId": "...", "seats": [{ "ticketId": "...", "seatNumber": "E10" }] }` (cargo: only `newTripId`). Passenger seats keep the same class and original price. Cargo bookings with an optional VIP seat keep the same seat number; it must be free and the new VIP fare cannot be higher than the original. Booking returns to `confirmed` if already paid, otherwise `pending`.
  - **Cancels for a refund:** `PATCH /bookings/:id/cancel`.

## Booking flow
1. `GET /trips?origin&destination&date` -> pick trip -> `GET /trips/:id/seats`
2. `POST /bookings` -> creates booking + tickets + payment (pending) + invoice + notification
3. Online: `POST /payments/:id/pay-online` (simulated gateway) -> booking becomes `confirmed`
   Physical: admin `PATCH /payments/:id/confirm` at the counter -> `confirmed`
4. `GET /invoices/booking/:bookingId` shows the invoice; `GET /tickets/my` shows tickets

---

## Added for the user side

- `GET /api/trips` now also returns `seatsTotal`, `seatsAvailable`, `seatsAvailableByClass`, `cargoAvailableKg` per trip, accepts `boatType=roro|fastcraft|cargo|ferry`, and never lists sailings that already departed.
- `GET /api/bookings/:id/reschedule-options?date=YYYY-MM-DD` - sailings on the same route the booking can move to. Works for operator-cancelled trips (`reschedule_pending`) **and** for the passenger's own request (`pending` / `confirmed`, at least 4 hours before departure).
- `POST /api/bookings/:id/reschedule` body `{ newTripId, reason, seats: [{ ticketId, seatNumber }] }` - `reason` is required when the passenger moves the booking; the new fare must not be higher than what was paid and seats must be in the same class.
- `GET/PUT /api/auth/me`, `PUT /api/auth/change-password`.
- Boats have `operator`, `logoUrl`, `description`; ports have `latitude`, `longitude`; boat type `cargo` was added.
