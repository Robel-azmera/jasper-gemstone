import { z } from "zod";
import {
  BOOKING_TYPES,
  CONSULTATION_BOOKING_TYPES,
  CONTACT_PREFERENCES,
  GEMSTONE_BOOKING_TYPES,
  LIMITS,
} from "./constants";
import {
  countLinks,
  phoneDigits,
  sanitizeLine,
  sanitizeMultiline,
  sanitizePhone,
} from "./sanitize";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isRealDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

const optionalLine = (max: number) =>
  z.preprocess(sanitizeLine, z.string().max(max, `Must be at most ${max} characters`));

/**
 * Schema for the public booking request. Used by the browser for instant
 * feedback and by the API route as the authoritative check (all values are
 * sanitized by the preprocessors before validation).
 */
const requestObject = z.object({
    kind: z.enum(["gemstone", "consultation"]),
    gemstoneId: z
      .preprocess(sanitizeLine, z.string().max(128).regex(/^[A-Za-z0-9_-]*$/, "Invalid gemstone"))
      .optional(),
    bookingType: z.enum(BOOKING_TYPES, { error: "Please choose a request type" }),
    customerName: z.preprocess(
      sanitizeLine,
      z
        .string()
        .min(2, "Please enter your full name")
        .max(LIMITS.name, `Name must be at most ${LIMITS.name} characters`),
    ),
    phoneNumber: z.preprocess(
      sanitizePhone,
      z
        .string()
        .max(LIMITS.phone, "Phone number is too long")
        .refine((v) => {
          const n = phoneDigits(v).length;
          return n >= 7 && n <= 15;
        }, "Please enter a valid phone number"),
    ),
    email: z.preprocess(
      (v) => sanitizeLine(v).toLowerCase(),
      z.union([z.literal(""), z.email("Please enter a valid email address").max(LIMITS.email)]),
    ),
    contactPreference: z.enum(CONTACT_PREFERENCES, {
      error: "Please choose how we should contact you",
    }),
    preferredDate: z.preprocess(
      sanitizeLine,
      z.union([z.literal(""), z.string().refine(isRealDate, "Please choose a valid date")]),
    ),
    preferredTime: z.preprocess(
      sanitizeLine,
      z.union([z.literal(""), z.string().regex(TIME_RE, "Please choose a valid time")]),
    ),
    message: z.preprocess(
      sanitizeMultiline,
      z
        .string()
        .max(LIMITS.message, `Message must be at most ${LIMITS.message} characters`)
        .refine((v) => countLinks(v) <= 2, "Please remove links from your message"),
    ),
    consent: z.literal(true, { error: "Please acknowledge the privacy notice" }),
    // --- anti-spam / anti-duplicate fields (not stored) ---
    website: optionalLine(200).optional(), // honeypot – must stay empty
    startedAt: z.number().int().nonnegative(),
    idempotencyKey: z.string().regex(/^[A-Za-z0-9-]{16,64}$/, "Invalid request"),
    turnstileToken: z.string().max(4096).optional(),
  });

export const bookingRequestSchema = requestObject.superRefine((data, ctx) => {
    if (data.kind === "gemstone") {
      if (!data.gemstoneId) {
        ctx.addIssue({ code: "custom", path: ["gemstoneId"], message: "No gemstone selected" });
      }
      if (!(GEMSTONE_BOOKING_TYPES as readonly string[]).includes(data.bookingType)) {
        ctx.addIssue({ code: "custom", path: ["bookingType"], message: "Please choose a request type" });
      }
    } else if (!(CONSULTATION_BOOKING_TYPES as readonly string[]).includes(data.bookingType)) {
      ctx.addIssue({ code: "custom", path: ["bookingType"], message: "Please choose a request type" });
    }

    if (data.contactPreference === "Email" && !data.email) {
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "Please add your email so we can contact you by email",
      });
    }

    if (data.preferredDate) {
      const t = new Date(`${data.preferredDate}T00:00:00Z`).getTime();
      const now = Date.now();
      // One day of slack for time zones; at most one year ahead.
      if (t < now - 2 * DAY_MS) {
        ctx.addIssue({ code: "custom", path: ["preferredDate"], message: "Please choose a future date" });
      } else if (t > now + 366 * DAY_MS) {
        ctx.addIssue({ code: "custom", path: ["preferredDate"], message: "Please choose a date within the next year" });
      }
    }
  },
  // Run cross-field checks even when other fields are invalid, so every
  // problem is reported in one pass (values may be partially unparsed here).
  { when: (payload) => typeof payload.value === "object" && payload.value !== null },
);

export type BookingRequestInput = z.input<typeof bookingRequestSchema>;
export type BookingRequest = z.output<typeof bookingRequestSchema>;

/** Map zod issues to `{ field: firstMessage }`. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Schema for admin edits of booking details (client-side, mirrored by rules). */
export const adminBookingEditSchema = z
  .object({
    customerName: requestObject.shape.customerName,
    phoneNumber: requestObject.shape.phoneNumber,
    email: requestObject.shape.email,
    contactPreference: requestObject.shape.contactPreference,
    bookingType: requestObject.shape.bookingType,
    preferredDate: requestObject.shape.preferredDate,
    preferredTime: requestObject.shape.preferredTime,
    message: z.preprocess(sanitizeMultiline, z.string().max(LIMITS.message)),
  })
  .superRefine((data, ctx) => {
    if (data.contactPreference === "Email" && !data.email) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Email is required for email contact" });
    }
  });
