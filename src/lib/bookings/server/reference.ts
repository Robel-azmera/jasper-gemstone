import "server-only";

import { randomInt } from "node:crypto";

// No 0/O, 1/I/L: easy to read out over the phone.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * Human-friendly booking reference, e.g. `JG-261109-K7QM4T`.
 * Date prefix + 6 random chars (~887M combinations per day); uniqueness is
 * additionally checked inside the create transaction.
 */
export function generateReferenceNumber(now = new Date()): string {
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `JG-${yy}${mm}${dd}-${suffix}`;
}
