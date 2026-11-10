# Jasper Gemstone

Luxury gemstone website with a public booking & reservation system and a real-time admin dashboard.
Built with Next.js 16 (App Router), Tailwind CSS 4 and Firebase (Auth + Firestore).

## Features

**Public site**
- **Find your gemstone** (`/gemstones`): choose a gemstone type, then a cut. Once a type is picked, every cut tile previews
  that gem in the cut. Clicking a cut opens **Browse** (`/collection?type=…&cut=…`), which lists matching stones and has a
  "see it in every cut" strip, type chips, sorting and an available-only toggle.
- Gemstone pages have a photo gallery with thumbnails, a "see it in every cut" strip under the image, specs, price per carat,
  a gemologist's review and related stones. Stones without photos are drawn as an illustration in their own cut and colours.
- Gemstone collection and detail pages; each detail page has a **Reserve This Gemstone** button that opens the booking modal.
  The modal has the gemstone pre-filled and offers either a reservation or a viewing.
- **Book a Consultation** page (`/book`) for viewings, consultations, custom inquiries and business appointments.
- Inline validation, loading and error states, a privacy notice with consent, and a confirmation screen showing a
  unique reference number (e.g. `JG-261109-K7QM4T`). Requests always start as **Pending** and are never confirmed automatically.

**Admin (`/admin`)**
- Gemstones (`/admin/gemstones`): add, edit and delete stones. Set the gemstone type, cut, name, ID, price, weight,
  availability and specs, a gemologist's review, and up to 12 photos (upload, reorder, remove).
  Photos are resized and compressed in the browser, stored in the Firestore `gemstoneImages` collection, and served from
  `/images/gems/{id}` with long-lived caching. No Firebase Storage or paid plan is needed.
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

`gemstones/{id}` holds `type`, `shape`, `images`, `review` and `certificate` alongside the stone's details. The gem types
and cuts are listed in `src/lib/gemstones/catalog.ts`.

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
4. If the Firebase CLI isn't logged in, deploy the rules with the service account instead: `npm run deploy:rules:sa`
5. Optionally seed the demo gemstones: `npm run seed`
6. Create the admin user in Firebase Console → Authentication, then grant the claim:
   `npm run set-admin -- owner@example.com`
7. `npm run dev` and open http://localhost:3000, and http://localhost:3000/admin for the dashboard.

Without Firebase credentials the public site still renders using the bundled demo catalogue
(`src/data/demo-gemstones.json`). Booking submission returns a friendly "temporarily unavailable" message in that case.

## Deploying to Vercel

1. **Environment variables** go in Vercel → Project → Settings → Environment Variables. Apply them to Production and Preview:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_FIREBASE_API_KEY`, `…_AUTH_DOMAIN`, `…_PROJECT_ID`, `…_STORAGE_BUCKET`, `…_MESSAGING_SENDER_ID`, `…_APP_ID` | same as `.env.local` |
   | `FIREBASE_SERVICE_ACCOUNT_KEY` | the base64 value from `.env.local` (secret) |
   | `BOOKING_HASH_SALT` | same as `.env.local` (secret) |
   | `NEXT_PUBLIC_SITE_URL` | optional: your custom domain, e.g. `https://jaspergemstone.com`. Defaults to the Vercel production domain. |
   | `BOOKING_RATE_LIMIT_PER_HOUR`, Turnstile and Resend keys | optional |

   `NEXT_PUBLIC_*` values are baked in at build time, so **redeploy** after changing them.
2. **Firebase → Authentication → Settings → Authorized domains:** add your Vercel domain(s), e.g.
   `jasper-gemstone.vercel.app` and any custom domain. Without this, admin sign-in fails.
3. Functions run in `fra1` (Frankfurt), set in `vercel.json`, close to the Firestore `eur3` database.

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
