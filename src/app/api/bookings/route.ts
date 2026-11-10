import { after, NextResponse } from "next/server";
import { MIN_FILL_TIME_MS } from "@/lib/bookings/constants";
import { BookingError, createBooking } from "@/lib/bookings/server/create";
import { sendNewBookingEmail } from "@/lib/bookings/server/notify";
import { checkRateLimit, clientIp, isSameOrigin, verifyTurnstile } from "@/lib/bookings/server/spam";
import { bookingRequestSchema, fieldErrors } from "@/lib/bookings/validation";
import { isAdminConfigured } from "@/lib/firebase/admin";

const MAX_BODY_BYTES = 16 * 1024;

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Public booking submission endpoint.
 *
 * The browser never writes to Firestore directly: this handler validates and
 * sanitizes the request, applies spam protection, then writes with the Admin
 * SDK. Firestore rules deny all public reads/writes on `bookings`.
 */
export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return json(503, {
      error: "Online booking is temporarily unavailable. Please contact us by phone or WhatsApp.",
    });
  }
  if (!isSameOrigin(request.headers)) {
    return json(403, { error: "Request not allowed." });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json(415, { error: "Unsupported request." });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json(413, { error: "Your request is too large." });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "Invalid request." });
  }

  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(422, {
      error: "Please check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    });
  }
  const data = parsed.data;
  const ip = clientIp(request.headers);

  // Honeypot / timing trap: pretend success so bots learn nothing.
  const elapsed = Date.now() - data.startedAt;
  if (data.website || elapsed < MIN_FILL_TIME_MS) {
    console.warn("[bookings] spam trap triggered", { honeypot: Boolean(data.website), elapsed });
    return json(200, { ok: true, referenceNumber: "JG-RECEIVED", duplicate: false });
  }

  if (!(await verifyTurnstile(data.turnstileToken, ip))) {
    return json(400, { error: "Verification failed. Please try again." });
  }

  try {
    if (!(await checkRateLimit(ip))) {
      return json(429, {
        error: "You have sent several requests recently. Please wait a little or contact us directly.",
      });
    }

    const result = await createBooking(data);

    if (!result.duplicate) {
      // Send the admin email after the response so the visitor isn't kept waiting.
      after(() =>
        sendNewBookingEmail({
          bookingId: result.bookingId,
          referenceNumber: result.referenceNumber,
          customerName: data.customerName,
          phoneNumber: data.phoneNumber,
          email: data.email,
          contactPreference: data.contactPreference,
          gemstoneName: result.gemstoneName,
          gemstoneStatusAtBooking: result.gemstoneStatusAtBooking,
          bookingType: data.bookingType,
          preferredDate: data.preferredDate || null,
          preferredTime: data.preferredTime || null,
          message: data.message,
        }).catch((err) => console.error("[bookings] email error", err)),
      );
    }

    // Only the reference is returned – never any stored customer data.
    return json(result.duplicate ? 200 : 201, {
      ok: true,
      referenceNumber: result.referenceNumber,
      duplicate: result.duplicate,
    });
  } catch (err) {
    if (err instanceof BookingError && err.code === "gemstone_not_found") {
      return json(404, {
        error: "This gemstone is no longer listed. You can still request a general consultation.",
      });
    }
    console.error("[bookings] create failed", err);
    return json(500, {
      error: "We couldn't submit your request right now. Please try again or contact us directly.",
    });
  }
}
