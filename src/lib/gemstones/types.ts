export type GemstoneStatus = "available" | "reserved" | "sold";

export const GEMSTONE_STATUSES: GemstoneStatus[] = ["available", "reserved", "sold"];

/** A photo stored in the `gemstoneImages` collection (see /images/gems/[file]). */
export interface GemImage {
  id: string;
  w: number;
  h: number;
}

export interface Gemstone {
  id: string;
  name: string;
  /** Gem type slug, e.g. "sapphire" (see catalog.ts). */
  type: string;
  /** Display name of the gem type / variety, e.g. "Sapphire". */
  variety: string;
  /** Cut shape slug, e.g. "oval" (see catalog.ts). */
  shape: string;
  carat: number | null;
  color: string;
  origin: string;
  clarity: string;
  /** Free-text cut description, e.g. "Oval mixed cut". */
  cut: string;
  treatment: string;
  dimensions: string;
  certificate: string;
  price: number | null;
  currency: string;
  description: string;
  /** Gemologist's review / expert notes. */
  review: string;
  status: GemstoneStatus;
  images: GemImage[];
  /** External image URL (legacy / optional). Uploaded photos take precedence. */
  imageUrl: string | null;
  /** Two hex colours used for the illustration when no photo is uploaded. */
  palette: [string, string];
  featured: boolean;
  /** Milliseconds since epoch, 0 when unknown. */
  createdAt: number;
}

export function isGemstoneStatus(v: unknown): v is GemstoneStatus {
  return v === "available" || v === "reserved" || v === "sold";
}

export const GEMSTONE_STATUS_LABELS: Record<GemstoneStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
};

export function gemImageUrl(img: GemImage, size: "lg" | "sm" = "lg"): string {
  return `/images/gems/${img.id}${size === "sm" ? "-sm" : ""}`;
}

/** Main photo URL, or null to fall back to the illustration. */
export function primaryImage(gem: Pick<Gemstone, "images" | "imageUrl">, size: "lg" | "sm" = "lg"): string | null {
  if (gem.images[0]) return gemImageUrl(gem.images[0], size);
  return gem.imageUrl;
}
