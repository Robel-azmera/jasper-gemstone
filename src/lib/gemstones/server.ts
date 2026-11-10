import "server-only";

import { connection } from "next/server";
import demo from "@/data/demo-gemstones.json";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { isGemstoneStatus, type Gemstone } from "./types";

export const GEMSTONES_COLLECTION = "gemstones";

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export function normalizeGemstone(id: string, data: Record<string, unknown>): Gemstone {
  const palette = Array.isArray(data.palette) && data.palette.length === 2
    ? [str(data.palette[0], "#e9e1d4"), str(data.palette[1], "#8b1a1a")] as [string, string]
    : (["#e9e1d4", "#8b1a1a"] as [string, string]);
  return {
    id,
    name: str(data.name, "Untitled gemstone"),
    variety: str(data.variety),
    carat: typeof data.carat === "number" ? data.carat : null,
    color: str(data.color),
    origin: str(data.origin),
    clarity: str(data.clarity),
    cut: str(data.cut),
    treatment: str(data.treatment),
    dimensions: str(data.dimensions),
    price: typeof data.price === "number" ? data.price : null,
    currency: str(data.currency, "USD"),
    description: str(data.description),
    status: isGemstoneStatus(data.status) ? data.status : "available",
    imageUrl: typeof data.imageUrl === "string" && data.imageUrl ? data.imageUrl : null,
    palette,
    featured: data.featured === true,
  };
}

const demoGemstones: Gemstone[] = (demo as Array<Record<string, unknown>>).map((g) =>
  normalizeGemstone(String(g.id), g),
);

/** True when the site is showing the bundled demo catalogue (no Firebase). */
export function usingDemoCatalogue(): boolean {
  return !isAdminConfigured();
}

export async function listGemstones(): Promise<Gemstone[]> {
  await connection(); // availability must be fresh: always read at request time
  if (!isAdminConfigured()) return demoGemstones;
  const snap = await adminDb().collection(GEMSTONES_COLLECTION).orderBy("name").get();
  return snap.docs.map((d) => normalizeGemstone(d.id, d.data()));
}

export async function getGemstone(id: string): Promise<Gemstone | null> {
  await connection();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return null;
  if (!isAdminConfigured()) return demoGemstones.find((g) => g.id === id) ?? null;
  const doc = await adminDb().collection(GEMSTONES_COLLECTION).doc(id).get();
  return doc.exists ? normalizeGemstone(doc.id, doc.data() ?? {}) : null;
}
