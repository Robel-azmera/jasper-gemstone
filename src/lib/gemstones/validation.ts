import { z } from "zod";
import { CUTS, GEM_TYPES } from "./catalog";
import { GEMSTONE_STATUSES } from "./types";

const text = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters`);
const optionalNumber = (max: number, label: string) =>
  z
    .union([z.number(), z.null()])
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v <= max), `Enter a valid ${label}`);

export const GEMSTONE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,79}$/;
export const MAX_IMAGES = 12;

/** Admin gemstone form. Mirrored by `validGemstone()` in firestore.rules. */
export const gemstoneInputSchema = z.object({
  id: z.string().regex(GEMSTONE_ID_PATTERN, "Use 2–80 lowercase letters, numbers and dashes"),
  name: z.string().trim().min(2, "Enter a name").max(120, "Keep it under 120 characters"),
  type: z.enum(GEM_TYPES.map((t) => t.slug) as [string, ...string[]], { message: "Choose a gemstone" }),
  shape: z.enum(CUTS.map((c) => c.slug) as [string, ...string[]], { message: "Choose a cut" }),
  variety: text(80),
  price: optionalNumber(1_000_000_000, "price"),
  currency: z.string().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code"),
  carat: optionalNumber(100_000, "weight"),
  color: text(200),
  origin: text(200),
  clarity: text(200),
  cut: text(200),
  treatment: text(200),
  dimensions: text(200),
  certificate: text(200),
  description: text(5000),
  review: text(5000),
  status: z.enum(GEMSTONE_STATUSES as [string, ...string[]]),
  featured: z.boolean(),
  palette: z.tuple([z.string().regex(/^#[0-9a-f]{6}$/i), z.string().regex(/^#[0-9a-f]{6}$/i)]),
  images: z
    .array(z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/), w: z.number(), h: z.number() }))
    .max(MAX_IMAGES, `Up to ${MAX_IMAGES} photos`),
});

export type GemstoneInput = z.infer<typeof gemstoneInputSchema>;

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
