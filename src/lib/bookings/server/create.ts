import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { GEMSTONES_COLLECTION } from "@/lib/gemstones/server";
import { isGemstoneStatus } from "@/lib/gemstones/types";
import type { GemstoneStatusSnapshot } from "../types";
import type { BookingRequest } from "../validation";
import { phoneDigits } from "../sanitize";
import { generateReferenceNumber } from "./reference";
import { sha256 } from "./spam";

export const BOOKINGS_COLLECTION = "bookings";
export const BOOKING_GUARDS_COLLECTION = "bookingGuards";

/** Same person + same gemstone/type within this window = duplicate. */
const DUPLICATE_WINDOW_MS = 15 * 60 * 1000;
/** Idempotency keys are remembered for a day (covers retries/double-clicks). */
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export class BookingError extends Error {
  constructor(
    public code: "gemstone_not_found" | "reference_collision",
    message: string,
  ) {
    super(message);
  }
}

export interface CreateBookingResult {
  bookingId: string;
  referenceNumber: string;
  duplicate: boolean;
  gemstoneName: string | null;
  gemstoneStatusAtBooking: GemstoneStatusSnapshot | null;
}

interface GuardDoc {
  bookingId: string;
  referenceNumber: string;
  gemstoneName?: string | null;
  expiresAt: Timestamp;
}

export async function createBooking(req: BookingRequest): Promise<CreateBookingResult> {
  const db = adminDb();
  const gemstoneId = req.kind === "gemstone" ? (req.gemstoneId ?? null) : null;

  const idemRef = db
    .collection(BOOKING_GUARDS_COLLECTION)
    .doc(`idem_${sha256(`idem:${req.idempotencyKey}`)}`);
  const dupRef = db
    .collection(BOOKING_GUARDS_COLLECTION)
    .doc(`dup_${sha256(`dup:${phoneDigits(req.phoneNumber)}|${gemstoneId ?? "general"}|${req.bookingType}`)}`);
  const gemRef = gemstoneId ? db.collection(GEMSTONES_COLLECTION).doc(gemstoneId) : null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const referenceNumber = generateReferenceNumber();
    try {
      return await db.runTransaction(async (tx) => {
        const now = Date.now();
        // --- all reads first (Firestore transaction requirement) ---
        const [idemSnap, dupSnap, gemSnap, refSnap] = await Promise.all([
          tx.get(idemRef),
          tx.get(dupRef),
          gemRef ? tx.get(gemRef) : Promise.resolve(null),
          tx.get(
            db.collection(BOOKINGS_COLLECTION).where("referenceNumber", "==", referenceNumber).limit(1),
          ),
        ]);

        // Retry of the exact same submission (double click, network retry).
        for (const snap of [idemSnap, dupSnap]) {
          const guard = snap.data() as GuardDoc | undefined;
          if (guard && guard.expiresAt.toMillis() > now) {
            return {
              bookingId: guard.bookingId,
              referenceNumber: guard.referenceNumber,
              duplicate: true,
              gemstoneName: guard.gemstoneName ?? null,
              gemstoneStatusAtBooking: null,
            };
          }
        }

        let gemstoneName: string | null = null;
        let gemstoneStatusAtBooking: GemstoneStatusSnapshot | null = null;
        if (gemRef) {
          if (!gemSnap?.exists) {
            throw new BookingError("gemstone_not_found", "This gemstone is no longer listed.");
          }
          const g = gemSnap.data() ?? {};
          gemstoneName = typeof g.name === "string" ? g.name : "Gemstone";
          gemstoneStatusAtBooking = isGemstoneStatus(g.status) ? g.status : "unknown";
        }

        if (!refSnap.empty) {
          throw new BookingError("reference_collision", "Reference collision");
        }

        const bookingRef = db.collection(BOOKINGS_COLLECTION).doc();
        tx.create(bookingRef, {
          bookingId: bookingRef.id,
          referenceNumber,
          customerName: req.customerName,
          phoneNumber: req.phoneNumber,
          email: req.email,
          contactPreference: req.contactPreference,
          gemstoneId,
          gemstoneName,
          bookingType: req.bookingType,
          preferredDate: req.preferredDate || null,
          preferredTime: req.preferredTime || null,
          message: req.message,
          status: "Pending", // never auto-confirmed
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          adminNotes: "",
          read: false,
          readAt: null,
          gemstoneStatusAtBooking,
          source: "website",
        });

        tx.create(bookingRef.collection("history").doc(), {
          bookingId: bookingRef.id,
          type: "created",
          fromStatus: null,
          toStatus: "Pending",
          summary: `Request submitted via website (${req.contactPreference} preferred)`,
          actorEmail: null,
          at: FieldValue.serverTimestamp(),
        });

        const guard = { bookingId: bookingRef.id, referenceNumber, gemstoneName };
        tx.set(idemRef, { ...guard, expiresAt: Timestamp.fromMillis(now + IDEMPOTENCY_TTL_MS) });
        tx.set(dupRef, { ...guard, expiresAt: Timestamp.fromMillis(now + DUPLICATE_WINDOW_MS) });

        return {
          bookingId: bookingRef.id,
          referenceNumber,
          duplicate: false,
          gemstoneName,
          gemstoneStatusAtBooking,
        };
      });
    } catch (err) {
      if (err instanceof BookingError && err.code === "reference_collision") continue;
      throw err;
    }
  }
  throw new BookingError("reference_collision", "Could not allocate a reference number");
}
