import "server-only";

import { BOOKING_TYPE_LABELS, formatTimeSlot, type BookingType } from "../constants";
import { siteUrl } from "@/lib/site";
import { escapeHtml } from "../sanitize";

export interface NewBookingNotification {
  bookingId: string;
  referenceNumber: string;
  customerName: string;
  phoneNumber: string;
  email: string;
  contactPreference: string;
  gemstoneName: string | null;
  gemstoneStatusAtBooking: string | null;
  bookingType: BookingType;
  preferredDate: string | null;
  preferredTime: string | null;
  message: string;
}

/**
 * Email the administrator about a new booking via the Resend HTTP API.
 * Entirely server-side: credentials live in server env vars only and are
 * never bundled into client code. No-op unless configured.
 *
 *   RESEND_API_KEY, BOOKING_NOTIFY_EMAIL, BOOKING_FROM_EMAIL, NEXT_PUBLIC_SITE_URL
 */
export async function sendNewBookingEmail(b: NewBookingNotification): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.BOOKING_NOTIFY_EMAIL;
  const from = process.env.BOOKING_FROM_EMAIL;
  if (!apiKey || !to || !from) return;

  const link = `${siteUrl()}/admin/bookings?open=${encodeURIComponent(b.bookingId)}`;
  const rows: Array<[string, string]> = [
    ["Reference", b.referenceNumber],
    ["Type", BOOKING_TYPE_LABELS[b.bookingType]],
    ["Gemstone", b.gemstoneName ?? "—"],
    ["Gemstone status", b.gemstoneStatusAtBooking ?? "—"],
    ["Name", b.customerName],
    ["Phone", b.phoneNumber],
    ["Email", b.email || "—"],
    ["Contact via", b.contactPreference],
    ["Preferred date", b.preferredDate ?? "—"],
    ["Preferred time", b.preferredTime ? formatTimeSlot(b.preferredTime) : "—"],
    ["Message", b.message || "—"],
  ];

  const html = `
    <div style="font-family:Georgia,serif;color:#1c1917">
      <h2 style="color:#8b1a1a;font-weight:normal">New booking request</h2>
      <table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="color:#78716c;vertical-align:top">${escapeHtml(k)}</td><td style="white-space:pre-wrap">${escapeHtml(v)}</td></tr>`,
          )
          .join("")}
      </table>
      ${link ? `<p><a href="${escapeHtml(link)}" style="color:#8b1a1a">Open in admin dashboard</a></p>` : ""}
      <p style="font-size:12px;color:#78716c">This request is pending. Confirm availability before replying to the customer.</p>
    </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: to.split(",").map((s) => s.trim()).filter(Boolean),
      subject: `New booking ${b.referenceNumber} – ${b.customerName}`,
      html,
    }),
  });
  if (!res.ok) {
    console.error("[bookings] notification email failed", res.status, await res.text());
  }
}
