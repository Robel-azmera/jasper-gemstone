export type GemstoneStatus = "available" | "reserved" | "sold";

export interface Gemstone {
  id: string;
  name: string;
  variety: string;
  carat: number | null;
  color: string;
  origin: string;
  clarity: string;
  cut: string;
  treatment: string;
  dimensions: string;
  price: number | null;
  currency: string;
  description: string;
  status: GemstoneStatus;
  imageUrl: string | null;
  /** Two hex colours used for the placeholder visual when no image is set. */
  palette: [string, string];
  featured: boolean;
}

export function isGemstoneStatus(v: unknown): v is GemstoneStatus {
  return v === "available" || v === "reserved" || v === "sold";
}

export const GEMSTONE_STATUS_LABELS: Record<GemstoneStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
};
