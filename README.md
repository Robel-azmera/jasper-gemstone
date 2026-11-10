# Jasper Gemstone

Luxury gemstone website with a public booking & reservation system and a real-time admin dashboard.
Built with Next.js 16 (App Router), Tailwind CSS 4 and Firebase (Auth + Firestore).

## Features

**Public site**
- Gemstone collection and detail pages; each detail page has a **Reserve This Gemstone** button that opens the booking modal.
  The modal has the gemstone pre-filled and offers either a reservation or a viewing.
- **Book a Consultation** page (`/book`) for viewings, consultations, custom inquiries and business appointments.
- Inline validation, loading and error states, a privacy notice with consent, and a confirmation screen showing a
  unique reference number (e.g. `JG-261109-K7QM4T`). Requests always start as **Pending** and are never confirmed automatically.

**Admin (`/admin`)**
- Dashboard: total / pending / confirmed / completed / cancelled counts, a list of bookings awaiting a response,
  live recent activity, and warnings for active bookings whose gemstone is no longer available.
- Bookings: newest first; search by name, phone, reference or email; filter by status, unread, and submitted or appointment date.
- Booking drawer: full details, status changes, internal notes, editing details, cancelling (with confirmation),
  deleting (with confirmation), call/WhatsApp/email shortcuts, and the full change history.
- Notifications: live Firestore listeners, an unread badge and dropdown, toast and soft chime when a booking arrives,
  and unread rows highlighted. Opening a booking marks it as read, and you can mark it unread or mark all as read.

## How submissions are secured

```
Browser form ──POST /api/bookings──▶ Next.js route handler ──Admin SDK──▶ Firestore `bookings`
                                     • same-origin check, body size limit
                                     • zod validation + sanitising (shared schema)
                                     • honeypot field + minimum fill time
                                     • per-IP rate limit (Firestore, hashed IP)
                                     • optional Cloudflare Turnstile
                                     • idempotency key + 15-min duplicate guard
                                     • gemstone looked up server-side (name + availability snapshot)
```

- `firestore.rules` denies **all** public reads and writes on `bookings`. Only users with the `admin: true`
  custom claim can read, update or delete them. Updates are restricted to editable fields, and the history is append-only.
- The API only ever returns the reference number. It never returns stored customer data.
- Admin email notifications (Resend) run server-side after the response is sent. The API key lives only in server env vars.

### Firestore data

`bookings/{bookingId}`: `bookingId, referenceNumber, customerName, phoneNumber, email, contactPreference,
gemstoneId (null for consultations), gemstoneName, bookingType, preferredDate, preferredTime, message,
status, createdAt, updatedAt, adminNotes`, plus `read`, `readAt`, `gemstoneStatusAtBooking` and `source`.

`bookings/{id}/history/{entryId}` is an audit trail of creation, status changes, note updates and edits.

Statuses are `Pending | Confirmed | Contacted | Completed | Cancelled`. Booking types are `gemstone_reservation |
gemstone_viewing | gemstone_consultation | custom_inquiry | business_appointment`.

Server-only collections are `bookingGuards` (duplicate and idempotency guards) and `bookingRateLimits`, both with TTL on `expiresAt`.

## Setup

1. Create a Firebase project. Enable **Authentication → Email/Password** and **Firestore**.
2. `cp .env.example .env.local` and fill in the web config and a service-account key
   (Project settings → Service accounts → Generate new private key).
3. Install and deploy rules and indexes:
   ```bash
   npm install
   npx firebase-tools login
   npx firebase-tools use <project-id>
   npx firebase-tools deploy --only firestore:rules,firestore:indexes
   ```
4. Seed the demo gemstones: `npm run seed`
5. Create the admin user in Firebase Console → Authentication, then grant the claim:
   `npm run set-admin -- owner@example.com`
6. `npm run dev` and open http://localhost:3000, and http://localhost:3000/admin for the dashboard.

Without Firebase credentials the public site still renders using the bundled demo catalogue
(`src/data/demo-gemstones.json`). Booking submission returns a friendly "temporarily unavailable" message in that case.

## Project layout

```
src/app/(site)/…              public pages (home, collection, gemstone detail, /book, /privacy)
src/app/api/bookings/route.ts secure booking submission endpoint
src/app/admin/…               admin login, dashboard, bookings
src/components/booking/…      booking form, modal, confirmation
src/components/admin/…        auth + realtime bookings providers, drawer, notifications
src/lib/bookings/…            constants, shared validation, sanitising, admin Firestore client
src/lib/bookings/server/…     create transaction, spam protection, reference numbers, email
firestore.rules               security rules
```

## Notes

- The admin listens to the newest 1,000 bookings. Search and filtering run client-side over that live set.
- Gemstone availability lives in `gemstones/{id}.status` (`available | reserved | sold`). Admins see a warning on any
  active booking whose stone is no longer available or listed.
