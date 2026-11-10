import "server-only";

import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

export const RATE_LIMIT_COLLECTION = "bookingRateLimits";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = Number(process.env.BOOKING_RATE_LIMIT_PER_HOUR ?? 5);

export function sha256(value: string): string {
  const salt = process.env.BOOKING_HASH_SALT ?? "jasper-gemstone";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? headers.get("cf-connecting-ip") ?? "unknown";
}

/**
 * Fixed-window rate limit stored in Firestore so it works across serverless
 * instances. Only a salted hash of the IP is stored.
 * Returns true when the request is allowed.
 */
export async function checkRateLimit(ip: string): Promise<boolean> {
  const ref = adminDb().collection(RATE_LIMIT_COLLECTION).doc(sha256(`ip:${ip}`));
  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const data = snap.data() as { windowStart?: Timestamp; count?: number } | undefined;
    const windowStart = data?.windowStart?.toMillis() ?? 0;

    if (!snap.exists || now - windowStart > WINDOW_MS) {
      tx.set(ref, {
        windowStart: Timestamp.fromMillis(now),
        count: 1,
        // Configure a Firestore TTL policy on `expiresAt` to auto-clean.
        expiresAt: Timestamp.fromMillis(now + WINDOW_MS),
      });
      return true;
    }
    if ((data?.count ?? 0) >= MAX_PER_WINDOW) return false;
    tx.update(ref, { count: FieldValue.increment(1) });
    return true;
  });
}

/**
 * Optional Cloudflare Turnstile verification. Active only when
 * TURNSTILE_SECRET_KEY is set (and the matching site key on the client).
 */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token, remoteip: ip });
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}

/** Reject cross-site form posts (simple CSRF / abuse guard). */
export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  if (!origin) return true; // same-origin fetches from older browsers may omit it
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
