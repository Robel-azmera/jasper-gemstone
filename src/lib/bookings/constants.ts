// Shared (client + server) booking constants. Keep this file free of
// Firebase imports so it can be used anywhere.

export const BOOKING_STATUSES = [
  "Pending",
  "Confirmed",
  "Contacted",
  "Completed",
  "Cancelled",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const CONTACT_PREFERENCES = ["Phone", "WhatsApp", "Email"] as const;
export type ContactPreference = (typeof CONTACT_PREFERENCES)[number];

/** Booking types tied to a specific gemstone. */
export const GEMSTONE_BOOKING_TYPES = [
  "gemstone_reservation",
  "gemstone_viewing",
] as const;

/** Booking types for a general consultation (no gemstone). */
export const CONSULTATION_BOOKING_TYPES = [
  "gemstone_viewing",
  "gemstone_consultation",
  "custom_inquiry",
  "business_appointment",
] as const;

export const BOOKING_TYPES = [
  "gemstone_reservation",
  "gemstone_viewing",
  "gemstone_consultation",
  "custom_inquiry",
  "business_appointment",
] as const;
export type BookingType = (typeof BOOKING_TYPES)[number];

export const BOOKING_TYPE_LABELS: Record<BookingType, string> = {
  gemstone_reservation: "Gemstone reservation",
  gemstone_viewing: "Gemstone viewing",
  gemstone_consultation: "Gemstone consultation",
  custom_inquiry: "Custom gemstone inquiry",
  business_appointment: "General business appointment",
};

/** Appointment slots offered in the public form (24h "HH:MM"). */
export const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30",
] as const;

export function formatTimeSlot(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return slot;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export const LIMITS = {
  name: 100,
  phone: 30,
  email: 254,
  message: 1500,
  adminNotes: 5000,
} as const;

/** Minimum time (ms) a human needs to fill the form; faster = likely a bot. */
export const MIN_FILL_TIME_MS = 3000;

export const CONFIRMATION_MESSAGE =
  "Your gemstone reservation request has been received. Our team will contact you shortly to confirm the details.";

export const CONSULTATION_CONFIRMATION_MESSAGE =
  "Your consultation request has been received. Our team will contact you shortly to confirm the details.";
