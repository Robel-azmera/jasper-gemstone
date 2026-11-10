"use client";

// Admin-only Firestore access for bookings. Every operation here is
// authorised by Firestore security rules (admin custom claim), never by the UI.

import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  writeBatch,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { clientDb } from "@/lib/firebase/client";
import {
  BOOKING_STATUSES,
  BOOKING_TYPES,
  CONTACT_PREFERENCES,
  type BookingStatus,
  type BookingType,
  type ContactPreference,
} from "./constants";
import type { Booking, BookingHistoryEntry, BookingHistoryType, GemstoneStatusSnapshot } from "./types";

export const BOOKINGS = "bookings";
const MAX_LIVE_BOOKINGS = 1000;

const toDate = (v: unknown): Date | null => (v instanceof Timestamp ? v.toDate() : null);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const oneOf = <T extends string>(list: readonly T[], v: unknown, fallback: T): T =>
  list.includes(v as T) ? (v as T) : fallback;

export function toBooking(snap: QueryDocumentSnapshot | DocumentSnapshot): Booking {
  const d = (snap.data({ serverTimestamps: "estimate" }) ?? {}) as DocumentData;
  return {
    bookingId: snap.id,
    referenceNumber: str(d.referenceNumber),
    customerName: str(d.customerName),
    phoneNumber: str(d.phoneNumber),
    email: str(d.email),
    contactPreference: oneOf<ContactPreference>(CONTACT_PREFERENCES, d.contactPreference, "Phone"),
    gemstoneId: typeof d.gemstoneId === "string" ? d.gemstoneId : null,
    gemstoneName: typeof d.gemstoneName === "string" ? d.gemstoneName : null,
    bookingType: oneOf<BookingType>(BOOKING_TYPES, d.bookingType, "gemstone_consultation"),
    preferredDate: typeof d.preferredDate === "string" && d.preferredDate ? d.preferredDate : null,
    preferredTime: typeof d.preferredTime === "string" && d.preferredTime ? d.preferredTime : null,
    message: str(d.message),
    status: oneOf<BookingStatus>(BOOKING_STATUSES, d.status, "Pending"),
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
    adminNotes: str(d.adminNotes),
    read: d.read === true,
    readAt: toDate(d.readAt),
    gemstoneStatusAtBooking: (d.gemstoneStatusAtBooking ?? null) as GemstoneStatusSnapshot | null,
    source: str(d.source),
  };
}

export interface BookingsSnapshot {
  bookings: Booking[];
  /** Bookings that arrived after the initial load (for notifications). */
  arrived: Booking[];
  initial: boolean;
}

/** Real-time listener: newest bookings first. */
export function subscribeBookings(
  onData: (s: BookingsSnapshot) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  let initial = true;
  const q = query(collection(clientDb(), BOOKINGS), orderBy("createdAt", "desc"), limit(MAX_LIVE_BOOKINGS));
  return onSnapshot(
    q,
    (snap) => {
      const arrived = initial
        ? []
        : snap
            .docChanges()
            .filter((c) => c.type === "added" && !c.doc.metadata.hasPendingWrites)
            .map((c) => toBooking(c.doc));
      onData({ bookings: snap.docs.map(toBooking), arrived, initial });
      initial = false;
    },
    onError,
  );
}

function historyEntry(
  bookingId: string,
  type: BookingHistoryType,
  summary: string,
  actorEmail: string | null,
  extra: Partial<Pick<BookingHistoryEntry, "fromStatus" | "toStatus" | "changedFields">> = {},
) {
  return {
    bookingId,
    type,
    summary,
    actorEmail,
    fromStatus: extra.fromStatus ?? null,
    toStatus: extra.toStatus ?? null,
    changedFields: extra.changedFields ?? [],
    at: serverTimestamp(),
  };
}

function historyRef(bookingId: string) {
  return doc(collection(clientDb(), BOOKINGS, bookingId, "history"));
}

export async function changeStatus(
  booking: Booking,
  to: BookingStatus,
  actorEmail: string | null,
  note?: string,
) {
  if (booking.status === to) return;
  const batch = writeBatch(clientDb());
  batch.update(doc(clientDb(), BOOKINGS, booking.bookingId), {
    status: to,
    updatedAt: serverTimestamp(),
    read: true,
  });
  batch.set(
    historyRef(booking.bookingId),
    historyEntry(
      booking.bookingId,
      "status_changed",
      `Status changed from ${booking.status} to ${to}${note ? ` — ${note}` : ""}`,
      actorEmail,
      { fromStatus: booking.status, toStatus: to },
    ),
  );
  await batch.commit();
}

export async function saveAdminNotes(booking: Booking, notes: string, actorEmail: string | null) {
  const batch = writeBatch(clientDb());
  batch.update(doc(clientDb(), BOOKINGS, booking.bookingId), {
    adminNotes: notes,
    updatedAt: serverTimestamp(),
  });
  batch.set(
    historyRef(booking.bookingId),
    historyEntry(booking.bookingId, "notes_updated", "Internal notes updated", actorEmail),
  );
  await batch.commit();
}

export type EditableBookingFields = Pick<
  Booking,
  | "customerName"
  | "phoneNumber"
  | "email"
  | "contactPreference"
  | "bookingType"
  | "preferredDate"
  | "preferredTime"
  | "message"
>;

export async function editBookingDetails(
  booking: Booking,
  changes: EditableBookingFields,
  actorEmail: string | null,
) {
  const changed = (Object.keys(changes) as Array<keyof EditableBookingFields>).filter(
    (k) => (changes[k] ?? null) !== (booking[k] ?? null),
  );
  if (!changed.length) return;
  const update: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const k of changed) update[k] = changes[k] ?? null;

  const batch = writeBatch(clientDb());
  batch.update(doc(clientDb(), BOOKINGS, booking.bookingId), update);
  batch.set(
    historyRef(booking.bookingId),
    historyEntry(booking.bookingId, "details_edited", `Edited: ${changed.join(", ")}`, actorEmail, {
      changedFields: changed,
    }),
  );
  await batch.commit();
}

/** Mark one or many bookings read/unread (batched in chunks of 450). */
export async function setRead(ids: string[], read: boolean) {
  for (let i = 0; i < ids.length; i += 450) {
    const batch = writeBatch(clientDb());
    for (const id of ids.slice(i, i + 450)) {
      batch.update(doc(clientDb(), BOOKINGS, id), {
        read,
        readAt: read ? serverTimestamp() : null,
      });
    }
    await batch.commit();
  }
}

/** Permanently delete a booking and its history. */
export async function deleteBooking(bookingId: string) {
  const db = clientDb();
  const history = await getDocs(collection(db, BOOKINGS, bookingId, "history"));
  const refs = [...history.docs.map((d) => d.ref), doc(db, BOOKINGS, bookingId)];
  for (let i = 0; i < refs.length; i += 450) {
    const batch = writeBatch(db);
    refs.slice(i, i + 450).forEach((r) => batch.delete(r));
    await batch.commit();
  }
}

function toHistory(snap: QueryDocumentSnapshot): BookingHistoryEntry {
  const d = snap.data({ serverTimestamps: "estimate" });
  return {
    id: snap.id,
    bookingId: str(d.bookingId) || snap.ref.parent.parent?.id || "",
    type: d.type as BookingHistoryType,
    fromStatus: d.fromStatus ?? null,
    toStatus: d.toStatus ?? null,
    changedFields: Array.isArray(d.changedFields) ? d.changedFields : [],
    summary: str(d.summary),
    actorEmail: typeof d.actorEmail === "string" ? d.actorEmail : null,
    at: toDate(d.at),
  };
}

export function subscribeHistory(
  bookingId: string,
  onData: (h: BookingHistoryEntry[]) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  const q = query(collection(clientDb(), BOOKINGS, bookingId, "history"), orderBy("at", "desc"));
  return onSnapshot(q, (s) => onData(s.docs.map(toHistory)), onError);
}

/** Latest activity across all bookings (collection-group query). */
export function subscribeRecentActivity(
  onData: (h: BookingHistoryEntry[]) => void,
  onError: (e: Error) => void,
  max = 12,
): Unsubscribe {
  const q = query(collectionGroup(clientDb(), "history"), orderBy("at", "desc"), limit(max));
  return onSnapshot(q, (s) => onData(s.docs.map(toHistory)), onError);
}

export interface GemstoneAvailability {
  id: string;
  name: string;
  status: string;
}

/** Live map of gemstone availability, so admins see when a booked stone changes. */
export function subscribeGemstoneAvailability(
  onData: (m: Map<string, GemstoneAvailability>) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(clientDb(), "gemstones"),
    (s) => {
      const m = new Map<string, GemstoneAvailability>();
      s.docs.forEach((d) => {
        const data = d.data();
        m.set(d.id, { id: d.id, name: str(data.name), status: str(data.status) || "available" });
      });
      onData(m);
    },
    onError,
  );
}
