import type { BookingStatus, BookingType, ContactPreference } from "./constants";

export type GemstoneStatusSnapshot = "available" | "reserved" | "sold" | "unknown";

/** A booking as the admin UI sees it (timestamps converted to Date). */
export interface Booking {
  bookingId: string;
  referenceNumber: string;
  customerName: string;
  phoneNumber: string;
  email: string;
  contactPreference: ContactPreference;
  gemstoneId: string | null;
  gemstoneName: string | null;
  bookingType: BookingType;
  preferredDate: string | null; // YYYY-MM-DD
  preferredTime: string | null; // HH:MM
  message: string;
  status: BookingStatus;
  createdAt: Date | null;
  updatedAt: Date | null;
  adminNotes: string;
  /** Has an admin opened / acknowledged this booking? */
  read: boolean;
  readAt: Date | null;
  /** Gemstone availability at the moment the request was submitted. */
  gemstoneStatusAtBooking: GemstoneStatusSnapshot | null;
  source: string;
}

export type BookingHistoryType =
  | "created"
  | "status_changed"
  | "notes_updated"
  | "details_edited"
  | "marked_read";

export interface BookingHistoryEntry {
  id: string;
  bookingId: string;
  type: BookingHistoryType;
  fromStatus?: BookingStatus | null;
  toStatus?: BookingStatus | null;
  changedFields?: string[];
  summary: string;
  actorEmail: string | null;
  at: Date | null;
}
